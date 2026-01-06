import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export default function ErrorState({ 
  title = 'Connection Error', 
  message, 
  onRetry 
}: ErrorStateProps) {
  return (
    <div className="p-8">
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        {onRetry && (
          <CardContent>
            <Button onClick={onRetry}>Retry</Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
