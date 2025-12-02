import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { App as CapacitorApp } from '@capacitor/app';

// Handle deep links for email verification and password reset
// This listens to appUrlOpen event from Capacitor
CapacitorApp.addListener('appUrlOpen', (event) => {
  console.log('Deep link opened:', event.url);
  
  try {
    const url = new URL(event.url);
    
    // Extract hash parameters (Supabase sends tokens in hash)
    const hash = url.hash || url.searchParams.get('hash') || '';
    
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const type = hashParams.get('type');
      
      console.log('Deep link type:', type);
      
      // Route based on link type
      if (type === 'recovery') {
        // Password reset
        console.log('Redirecting to /reset-password');
        window.location.href = `/reset-password${hash}`;
      } else if (type === 'signup') {
        // Email verification
        console.log('Redirecting to /email-verified');
        window.location.href = `/email-verified${hash}`;
      } else {
        // Default fallback
        console.log('Redirecting to /auth');
        window.location.href = `/auth${hash}`;
      }
    } else if (url.pathname && url.pathname !== '/') {
      // Direct path navigation
      window.location.href = `${url.pathname}${url.search}${url.hash}`;
    }
  } catch (error) {
    console.error('Error parsing deep link:', error);
    // Fallback to auth page
    window.location.href = '/auth';
  }
});

createRoot(document.getElementById("root")!).render(<App />);
