import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/learn/search?q=黃連&limit=20
 * Full-text search across course lessons.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") ?? "20"), 50);

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [], query: q });
  }

  const lessons = await prisma.courseLesson.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
        { keyPoints: { contains: q, mode: "insensitive" } },
        { clinicalPearls: { contains: q, mode: "insensitive" } },
        { herbsMentioned: { contains: q, mode: "insensitive" } },
        { formulasMentioned: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      courseId: true,
      courseName: true,
      lessonNum: true,
      title: true,
      category: true,
      content: true,
    },
    orderBy: { lessonNum: "asc" },
    take: limit,
  });

  // Extract context snippet around the match
  const results = lessons.map((l) => {
    const idx = l.content.toLowerCase().indexOf(q.toLowerCase());
    const start = Math.max(0, idx - 60);
    const end = Math.min(l.content.length, idx + q.length + 120);
    const snippet = (start > 0 ? "…" : "") + l.content.slice(start, end).replace(/\n/g, " ") + (end < l.content.length ? "…" : "");
    return {
      id: l.id,
      courseId: l.courseId,
      courseName: l.courseName,
      lessonNum: l.lessonNum,
      title: l.title,
      category: l.category,
      snippet,
    };
  });

  return NextResponse.json({ results, query: q, count: results.length });
}
