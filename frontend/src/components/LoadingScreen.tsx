export function LoadingScreen({ message = "Memuat data..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-gradient-to-br from-background via-primary/5 to-background">
      {/* Animated circles background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-secondary/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "2s" }} />
      </div>

      {/* Logo with glow effect */}
      <div className="relative z-10 animate-bounce-in">
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse-slow" />
        <img 
          src="/images/logo.png" 
          alt="BK Logo" 
          className="relative w-24 h-24 sm:w-32 sm:h-32 drop-shadow-2xl animate-float"
        />
      </div>

      {/* Loading spinner */}
      <div className="relative z-10">
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </div>

      {/* Message with gradient text */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <p className="text-lg sm:text-xl font-bold text-gradient-multi animate-pulse-slow">
          {message}
        </p>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}
