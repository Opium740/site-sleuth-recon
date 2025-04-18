
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Add delay utility function 
export const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

// Extract domain from URL
export const extractDomain = (url: string): string | null => {
  try {
    const hostname = new URL(url).hostname;
    return hostname;
  } catch (error) {
    console.error('Error extracting domain:', error);
    return null;
  }
}
