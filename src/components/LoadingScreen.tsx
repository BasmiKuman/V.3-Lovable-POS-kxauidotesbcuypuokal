export function LoadingScreen({ message = "Memuat data..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <img 
        src="/images/logo.png" 
        alt="BK Logo" 
        className="w-20 h-20 animate-bounce"
      />
      <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
    </div>
  );
}
