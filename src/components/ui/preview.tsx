import { PageSection } from "@/components/layout/PageShell";
import { SectionShell } from "@/components/ui/section-shell";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Toolbar, ToolbarGroup, ToolbarTitle } from "@/components/ui/toolbar";

export function UIPrimitivesPreview() {
  return (
    <PageSection spacing="lg" className="space-y-8">
      <SectionShell>
        <Toolbar>
          <ToolbarTitle>Button variants</ToolbarTitle>
          <ToolbarGroup>
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="subtle">Subtle</Button>
            <Button variant="pill">Pill</Button>
            <Button variant="pulse">Pulse</Button>
          </ToolbarGroup>
        </Toolbar>
      </SectionShell>

      <SectionShell>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Deck count" value="24" description="aktywnych talii" />
          <StatCard label="Flashcards" value="420" description="wygenerowanych" variant="success" />
          <StatCard label="Rate limit" value="7/10" description="generacji w tym okresie" variant="warning" />
          <StatCard label="Błędy AI" value="2" description="ostatnie 24h" variant="danger" />
        </div>
      </SectionShell>
    </PageSection>
  );
}
