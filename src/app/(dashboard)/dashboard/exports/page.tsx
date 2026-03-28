"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Download, FileSpreadsheet, FileText, Inbox } from "lucide-react";
import { format } from "date-fns";
import { useProfile } from "@/components/providers/profile-provider";
import type { Export, ExportFormat } from "@/types";

interface ExportWithScan extends Export {
  scans?: { query_text: string } | null;
}

export default function ExportsPage() {
  const { userId } = useProfile();
  const [exports, setExports] = useState<ExportWithScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    async function fetchExports() {
      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from("exports")
          .select("*, scans(query_text)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;
        setExports(data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load exports");
      } finally {
        setLoading(false);
      }
    }

    fetchExports();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Export History</h1>
        <p className="text-muted-foreground mt-1">
          View and download your previous exports
        </p>
      </div>

      {exports.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No exports yet</h3>
            <p className="text-muted-foreground max-w-sm">
              No exports yet. Run a scan and export the results!
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass">
          <CardHeader>
            <CardTitle>Your Exports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Scan Query
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Format
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                      Download
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {exports.map((exp) => (
                    <tr
                      key={exp.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm">
                        {exp.scans?.query_text ?? "Unknown scan"}
                      </td>
                      <td className="py-3 px-4">
                        <FormatBadge format={exp.format} />
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {format(new Date(exp.created_at), "MMM d, yyyy HH:mm")}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <a
                          href={exp.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FormatBadge({ format }: { format: ExportFormat }) {
  if (format === "xlsx") {
    return (
      <Badge className="bg-green-400/10 text-green-400 border-green-400/20 gap-1">
        <FileSpreadsheet className="h-3 w-3" />
        XLSX
      </Badge>
    );
  }
  return (
    <Badge className="bg-blue-400/10 text-blue-400 border-blue-400/20 gap-1">
      <FileText className="h-3 w-3" />
      CSV
    </Badge>
  );
}
