import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-card/60 backdrop-blur-lg border-border/30">
        <CardHeader className="items-center text-center">
          <Logo className="h-14 w-14 text-primary mb-4" />
          <CardTitle className="text-3xl font-bold">Welcome to NexHireAI</CardTitle>
          <CardDescription>Your AI-Powered Hiring Assessment Platform</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">We are starting fresh. We will build the features one by one from here.</p>
        </CardContent>
      </Card>
    </main>
  );
}
