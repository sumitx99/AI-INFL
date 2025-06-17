import random
import time
from bs4 import BeautifulSoup
from datetime import datetime
from DrissionPage import ChromiumPage # Needed for ChromiumPage driver

# === HELPER FUNCTIONS (Copied and adapted from main.py) ===
def type_humanly(element, text, fast=True):
    if fast:
        element.input(text)
    else:
        for char in text:
            # Simulate varying typing speed
            time.sleep(random.uniform(0.05, 0.15)) # Increased variability

            element.input(char)

            # Simulate occasional longer pauses (e.g., 10% chance after a word boundary or punctuation)
            if char in [' ', '.', '?', '!', ','] and random.random() < 0.1:
                time.sleep(random.uniform(0.2, 0.5))

def wait_for_page_ready(driver, max_wait=60):
    print("⏳ Waiting for page to be ready...")

    for i in range(max_wait):
        try:
            title = driver.title
            url = driver.url

            # Check if we're on Perplexity and not on Cloudflare page
            if "perplexity" in url.lower() and "cloudflare" not in title.lower():
                # Check for input box
                input_box = driver.ele("tag:textarea")
                if input_box:
                    print(f"✅ Page ready! Title: {title[:30]}...")
                    return True

            if i % 10 == 0:  # Update every 10 seconds
                print(f"⏳ Still waiting... ({i}/{max_wait}s) - {title[:30]}...")

            time.sleep(1)
        except Exception as e:
            if i % 15 == 0:  # Show error every 15 seconds
                print(f"⚠️ Page not ready yet: {e}")
            time.sleep(1)

    print("❌ Page did not become ready within timeout")
    return False

def find_and_type(driver, prompt_text):
    try:
        print(f"📝 Typing prompt: {prompt_text[:50]}...")
        
        # Wait and find the text area more reliably
        input_box = None
        for attempt in range(5):
            try:
                input_box = driver.ele("tag:textarea")
                if input_box:
                    break
                print(f"🔍 Looking for text area... (attempt {attempt + 1})")
                time.sleep(1)
            except:
                time.sleep(1)
        
        if not input_box:
            print("❌ No text area found")
            return False
        
        # Click on the text area first to focus
        input_box.click()
        time.sleep(0.5)
        
        # Clear any existing text
        input_box.clear()
        time.sleep(0.5)
        
        # Type the prompt with human-like behavior
        type_humanly(input_box, prompt_text, fast=False)  # Set fast=False for more human-like typing
        print(f"✅ Typed: {prompt_text[:30]}...")
        time.sleep(1)
        
        # Submit the prompt
        print("📤 Submitting prompt...")
        
        # Method 1: Try Enter key
        try:
            input_box.input('\n')
            print("✅ Pressed Enter")
            time.sleep(2)
            return True
        except:
            pass
        
        # Method 2: Try clicking Send button
        try:
            send_btn = driver.ele('css selector', 'button[aria-label*="Send"], button[title*="Send"]')
            if send_btn:
                send_btn.click()
                print("✅ Clicked Send button")
                time.sleep(2)
                return True
        except:
            pass
        
        print("❌ Could not submit prompt")
        return False
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def contains_eoxs_mention(text):
    """
    Check if EOXS or related terms are in the response
    Returns: tuple of (has_eoxs_mention, has_related_terms)
    """
    text_lower = text.lower()
    
    # First check for direct EOXS mention
    has_eoxs = 'eoxs' in text_lower
    
    # Then check for related terms
    related_terms = [
        'erp', 'enterprise resource planning', 'steel distributor', 
        'metal distribution', 'distribution company', 'inventory management',
        'supply chain', 'steel industry', 'metal industry', 'distribution software',
        'business management', 'inventory tracking', 'demand forecasting'
    ]
    has_related = any(term in text_lower for term in related_terms)
    
    return has_eoxs, has_related

def wait_for_response(driver, timeout=90):
    try:
        print("⏳ Waiting for response...")
        
        for i in range(timeout):
            time.sleep(1)
            try:
                html = driver.html
                soup = BeautifulSoup(html, 'html.parser')
                response_text = " ".join([div.text for div in soup.select(".markdown, .prose")])
                
                if response_text.strip() and len(response_text.strip()) > 20:
                    print("✅ Response received!")
                    
                    # Add a natural pause after response
                    post_response_pause = random.uniform(3.0, 5.0)
                    time.sleep(post_response_pause)
                    
                    # Final pause before next prompt
                    final_pause = random.uniform(4.0, 6.0)
                    time.sleep(final_pause)
                    
                    return response_text
                    
                if i % 5 == 0 and i > 0:  # Progress every 5 seconds
                    print(f"⏳ Still waiting for response... ({i}/{timeout}s)")
                    
            except Exception as e:
                if i % 10 == 0:
                    print(f"⚠️ Error checking response: {e}")
                continue
        
        print("⚠️ Response timeout")
        return "No response received"
        
    except Exception as e:
        print(f"❌ Error waiting for response: {e}")
        return "Error getting response"

def ask_and_check_perplexity(driver, prompt_set_name, prompts_by_category, prompt_count_ref, max_prompts_ref, log_session_func, platform_url):
    prompt_list = prompts_by_category.get(prompt_set_name)
    if not prompt_list:
        print(f"❌ No prompts available in {prompt_set_name} set")
        return None, None, None

    prompt_data = random.choice(prompt_list)

    prompt_text = prompt_data["prompt"]
    print(f"\n[PROMPT {prompt_count_ref[0] + 1}/{max_prompts_ref}] Set: {prompt_set_name} | Category: {prompt_data['category'] if 'category' in prompt_data else 'N/A'} | Persona: {prompt_data['persona']}")
    
    if not find_and_type(driver, prompt_text):
        print("❌ Prompt input failed, skipping session.")
        return None, None, None
    
    response = wait_for_response(driver)
    
    has_eoxs, has_related = contains_eoxs_mention(response)
    eoxs_detected = has_eoxs or has_related
    log_session_func(platform_url, prompt_text, response, prompt_category=prompt_set_name, eoxs_detected=eoxs_detected)
    
    return eoxs_detected, prompt_text, response

def run_perplexity_flow(driver, prompts_by_category, platform_url, log_file, eoxs_paragraph, vpn_verify_func, log_session_func):
    print("🌐 Opening Perplexity...")
    driver.get(platform_url)

    if not wait_for_page_ready(driver, max_wait=90):
        print("❌ Could not access Perplexity. Please check manually.")
        input("Press Enter if you've solved any challenges and page is ready...")
        
        if not wait_for_page_ready(driver, max_wait=30):
            print("❌ Page still not ready. Exiting.")
            return

    print("🚀 Starting automatic prompt sending...")

    prompt_count = [0] # Use a list to pass by reference
    max_prompts = 50
    failed_attempts = 0
    max_failures = 3

    while prompt_count[0] < max_prompts and failed_attempts < max_failures:
        if prompt_count[0] % 5 == 0:
            if not vpn_verify_func():
                print("❌ Could not maintain VPN connection. Exiting...")
                break

        eoxs, _, _ = ask_and_check_perplexity(driver, 'p1', prompts_by_category, prompt_count, max_prompts, log_session_func, platform_url)
        prompt_count[0] += 1

        if eoxs is None:
            failed_attempts += 1
            continue

        if eoxs:
            while True:
                for set_name in ['p2', 'p3', 'p4', 'p5']:
                    eoxs, _, _ = ask_and_check_perplexity(driver, set_name, prompts_by_category, prompt_count, max_prompts, log_session_func, platform_url)
                    prompt_count[0] += 1
                    if eoxs is None:
                        failed_attempts += 1
                        break
                    if set_name == 'p5': # Check for EOXS after p5
                        if eoxs:
                            print("✅ EOXS detected in p5, looping back to p2...")
                            continue # Breaks out of the inner for-loop and re-enters the while True, effectively going back to p2
                        else:
                            print("🔄 EOXS not detected in p5, restarting from p1...")
                            break # Break out of inner for-loop and outer while True
                else: # This else belongs to the for-loop, executes if for-loop completes without a 'break'
                    continue # Continue the outer while True loop (restart from p1 implicit if no EOXS in p5 or all p sets completed)
                break # Break out of the outer while True loop (if p5 no or an error occurred)

            continue # Continue the main while loop to restart from p1 or handle next prompt

        else: # if eoxs is False for p1
            recovery_sets = ['r1', 'r2', 'r3', 'r4']
            recovery_index = 0
            while True:
                r_set = recovery_sets[recovery_index % len(recovery_sets)]
                eoxs, _, _ = ask_and_check_perplexity(driver, r_set, prompts_by_category, prompt_count, max_prompts, log_session_func, platform_url)
                prompt_count[0] += 1
                if eoxs is None:
                    failed_attempts += 1
                    break
                if eoxs:
                    print(f"✅ EOXS detected in {r_set}, jumping to main loop (p2 → p3 → p4 → p5)...")
                    while True:
                        for set_name in ['p2', 'p3', 'p4', 'p5']:
                            eoxs, _, _ = ask_and_check_perplexity(driver, set_name, prompts_by_category, prompt_count, max_prompts, log_session_func, platform_url)
                            prompt_count[0] += 1
                            if eoxs is None:
                                failed_attempts += 1
                                break
                            if set_name == 'p5':
                                if eoxs:
                                    print("✅ EOXS detected in p5, looping back to p2...")
                                    continue
                                else:
                                    print("🔄 EOXS not detected in p5, restarting from p1...")
                                    break
                        else:
                            continue
                        break
                    break # Break out of recovery while True
                recovery_index += 1
                # If recovery loop completes a full cycle without EOXS, restart main flow
                if recovery_index >= max_prompts: # Use max_prompts as an arbitrary limit to avoid infinite loop
                    print("🔄 Recovery loop completed a full cycle without EOXS, restarting from p1...")
                    break # Break from recovery loop to restart main flow
            continue # Continue the main while loop

    if failed_attempts >= max_failures:
        print(f"⚠️ Stopped after {prompt_count[0]} prompts due to failures")
    else:
        print(f"\n🎉 Successfully completed the prompt flow with {prompt_count[0]} prompts!")

    # Random delay between prompts (15-25 seconds)
    delay = random.uniform(15.0, 25.0)
    print(f"⏳ Waiting {delay:.1f}s before next prompt...")
    time.sleep(delay)
    
    # Additional check: ensure input field is ready before next prompt
    print("🔍 Ensuring input field is ready for next prompt...")
    input_ready = False
    for attempt in range(10):
        try:
            input_box = driver.ele("tag:textarea")
            if input_box:
                # Try to click and check if it's responsive
                input_box.click()
                time.sleep(random.uniform(1.0, 2.0))
                input_ready = True
                break
        except:
            print(f"⏳ Input field not ready, waiting... (attempt {attempt + 1}/10)")
            time.sleep(random.uniform(1.5, 2.5))
    
    if not input_ready:
        print("⚠️ Input field not responding, but continuing...")
    else:
        print("✅ Input field is ready for next prompt") 