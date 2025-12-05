import { useState, useEffect } from 'react';
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useNavigate } from 'react-router-dom';
import { Home, Package, ShoppingCart, BarChart3, Settings, Warehouse, Search, ClipboardList } from 'lucide-react';

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <>
      {/* Floating search button removed - causes UI interference */}
      {/* <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex items-center gap-2 px-4 py-2 bg-gradient-primary text-white rounded-full shadow-glow-primary hover-lift hover:scale-105 transition-all duration-300 sm:hidden"
      >
        <Search className="w-4 h-4" />
        <span className="text-sm font-semibold">Search</span>
      </button> */}

      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="glass border-border/50">
          <CommandInput placeholder="Cari menu atau fitur..." />
          <CommandList>
            <CommandEmpty>Tidak ada hasil ditemukan.</CommandEmpty>
            <CommandGroup heading="Navigasi">
              <CommandItem onSelect={() => runCommand(() => navigate('/dashboard'))}>
                <Home className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/products'))}>
                <Package className="mr-2 h-4 w-4" />
                <span>Produk</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/warehouse'))}>
                <Warehouse className="mr-2 h-4 w-4" />
                <span>Gudang</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/pos'))}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                <span>POS / Kasir</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/manual-sales'))}>
                <ClipboardList className="mr-2 h-4 w-4" />
                <span>Penjualan Manual</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/reports'))}>
                <BarChart3 className="mr-2 h-4 w-4" />
                <span>Laporan</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate('/settings'))}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Pengaturan</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
          <div className="p-2 border-t border-border/50 text-xs text-muted-foreground flex items-center justify-center gap-2">
            <kbd className="px-2 py-1 bg-muted rounded text-[10px] font-mono">Ctrl</kbd>
            <span>+</span>
            <kbd className="px-2 py-1 bg-muted rounded text-[10px] font-mono">K</kbd>
            <span className="ml-2">untuk membuka</span>
          </div>
        </div>
      </CommandDialog>
    </>
  );
};