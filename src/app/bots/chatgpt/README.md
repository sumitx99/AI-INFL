# LLM Infiltrator Bot

This bot automates interactions with ChatGPT to promote EOXS, an ERP platform for steel distributors.

## Prerequisites

1. Python 3.8 or higher
2. Private Internet Access (PIA) VPN client installed
3. Chrome browser installed

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Configure VPN:
   - Make sure PIA VPN is installed at the default location: `C:\Program Files\Private Internet Access\piactl.exe`
   - If installed elsewhere, update the `VPN_CONFIG['vpn_command']` path in `main.py`

3. Verify prompt files:
   - All prompt files should be in the `prompts/` directory:
     - p1.json through p5.json (main prompts)
     - r1.json through r4.json (recovery prompts)

## Usage

Run the bot:
```bash
python main.py
```

The bot will:
1. Connect to PIA VPN
2. Open ChatGPT in Chrome
3. Start sending prompts automatically
4. Log all interactions to `logs.csv`

## Features

- Human-like typing simulation
- Automatic VPN connection management
- Smart prompt sequencing
- EOXS detection and injection
- Detailed logging
- Error recovery

## Logging

All interactions are logged to `logs.csv` with the following information:
- Platform URL
- Prompt used
- Response received
- Prompt set used
- EOXS detection status
- Timestamp

## Error Handling

The bot includes:
- Automatic VPN reconnection
- Browser error recovery
- Prompt failure handling
- Maximum retry limits

## Note

Make sure you have proper authorization to use this bot on the target platform and comply with all terms of service. 