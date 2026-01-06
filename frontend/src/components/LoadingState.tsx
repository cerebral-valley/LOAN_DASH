export default function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-lg">{message}</div>
    </div>
  );
}