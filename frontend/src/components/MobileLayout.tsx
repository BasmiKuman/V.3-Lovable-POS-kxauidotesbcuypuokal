import { ReactNode } from "react";

interface MobileLayoutProps {
  children: ReactNode;
  className?: string;
}

export const MobileLayout = ({ children, className = "" }: MobileLayoutProps) => {
  return (
    <div 
      className={`min-h-screen w-full overflow-x-hidden ${className}`}
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {children}
    </div>
  );
};

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  hasBottomNav?: boolean;
}

export const PageContainer = ({ 
  children, 
  className = "",
  hasBottomNav = true 
}: PageContainerProps) => {
  return (
    <div 
      className={`w-full overflow-x-hidden ${className}`}
      style={{
        paddingBottom: hasBottomNav 
          ? 'calc(4rem + env(safe-area-inset-bottom, 0px))' 
          : 'env(safe-area-inset-bottom, 0px)',
        minHeight: '100vh',
      }}
    >
      {children}
    </div>
  );
};
