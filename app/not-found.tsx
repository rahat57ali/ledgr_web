import Link from "next/link";
import { PageTitle, Card, Button, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-6">
      <div className="text-center">
        <h1 className="font-outfit text-9xl font-extrabold text-[var(--accent)]">404</h1>
        <p className="font-inter mt-4 text-xl font-medium text-[var(--text-secondary)]">The page you're looking for doesn't exist.</p>
      </div>
      
      <Card className="max-w-md w-full">
        <EmptyState 
          title="Lost in space?"
          description="We couldn't find the page you were looking for. It might have been moved or deleted."
        />
        <div className="mt-6 flex justify-center">
          <Link href="/track">
            <Button>
              Back to Track
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
