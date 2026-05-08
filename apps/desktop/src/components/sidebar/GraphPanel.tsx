import { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import { useVaultStore } from "@stores/vault";
import { useEditorStore } from "@stores/editor";
import { GraphNode, GraphEdge } from "@vaultkeeper/types";

export function GraphPanel() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { notes } = useVaultStore();
  const { openNote } = useEditorStore();

  const renderGraph = useCallback(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    if (width === 0 || height === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const notesArray = Array.from(notes.values()).filter((n) => !n.isDeleted);

    const nodes: GraphNode[] = notesArray.map((note) => ({
      id: note.id,
      label: note.title,
      type: "note",
    }));

    const edges: GraphEdge[] = [];
    const noteMap = new Map(notesArray.map((n) => [n.path, n]));

    for (const note of notesArray) {
      for (const link of note.outgoingLinks) {
        const targetNote = noteMap.get(link);
        if (targetNote) {
          edges.push({
            source: note.id,
            target: targetNote.id,
            type: "link",
          });
        }
      }
    }

    if (nodes.length === 0) {
      svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("fill", "var(--color-foreground-muted)")
        .attr("font-size", "12px")
        .text("No connections yet");
      return;
    }

    const simulation = d3
      .forceSimulation(nodes)
      .force("link", d3.forceLink(edges).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    const link = svg
      .append("g")
      .selectAll("line")
      .data(edges)
      .join("line")
      .attr("stroke", "var(--color-border)")
      .attr("stroke-width", 1);

    const node = svg
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .on("click", (_, d) => openNote(d.id));

    node
      .append("circle")
      .attr("r", 6)
      .attr("fill", "var(--color-accent)")
      .attr("stroke", "var(--color-border)")
      .attr("stroke-width", 1);

    node
      .append("text")
      .text((d) => d.label)
      .attr("x", 10)
      .attr("y", 4)
      .attr("fill", "var(--color-foreground)")
      .attr("font-size", "10px");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [notes, openNote]);

  useEffect(() => {
    renderGraph();
  }, [renderGraph]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <svg ref={svgRef} width="100%" height="100%" />
    </div>
  );
}
