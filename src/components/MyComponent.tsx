// src/components/MyComponent.tsx (CORRECT - Server Component)
import fs from 'fs/promises';
import path from 'path';

async function getData() {
  try {
    const filePath = path.join(process.cwd(), 'components.json');
    const jsonData = await fs.readFile(filePath, 'utf8');
    const componentsConfig = JSON.parse(jsonData);
    return componentsConfig.tailwind.baseColor;
  } catch (error) {
    console.error("Error reading components.json", error);
    return 'Error!'; // Handle error case
  }
}

export default async function MyComponent() {
  const baseColor = await getData();

  return <div>Base Color: {baseColor}</div>;
}