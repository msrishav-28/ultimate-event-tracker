import { Plus } from 'lucide-react';
import { Button } from './ui/button';

interface MobileAddButtonProps {
  onClick: () => void;
}

export function MobileAddButton({ onClick }: MobileAddButtonProps) {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg lg:hidden z-50 p-0 bg-primary hover:bg-primary/90"
      aria-label="Add event"
    >
      <Plus className="w-6 h-6" />
    </Button>
  );
}
