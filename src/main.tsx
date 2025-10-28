import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Handle deep links for email verification and password reset
// This runs when app is opened via deep link (com.basmikuman.pos://...)
if (typeof window !== 'undefined') {
  // Listen for URL changes (for Android deep links)
  window.addEventListener('message', (event) => {
    if (event.data && event.data.url) {
      const url = new URL(event.data.url);
      console.log('Deep link opened:', event.data.url);
      
      // Extract the hash part from the URL (Supabase sends tokens in hash)
      if (url.hash) {
        // Check if this is a password recovery link
        const hashParams = new URLSearchParams(url.hash.substring(1));
        const type = hashParams.get('type');
        
        if (type === 'recovery') {
          // Password reset - redirect to reset-password page
          window.location.href = `${window.location.origin}/reset-password${url.hash}`;
        } else if (type === 'signup') {
          // Email verification - redirect to email-verified page
          window.location.href = `${window.location.origin}/email-verified${url.hash}`;
        } else {
          // Default - redirect to auth page
          window.location.href = `${window.location.origin}/auth${url.hash}`;
        }
      } else if (url.pathname) {
        // Redirect to the appropriate page
        window.location.href = `${window.location.origin}${url.pathname}${url.search}${url.hash}`;
      }
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
