import { DataTable } from "@/components/ui/data-table";
import { Suspense } from "react";
import { getSession } from "src/lib/auth";
import { sessionType } from "src/types/session";
import { getTools } from "./actions";
import { columns } from "./columns";

export default async function DashboardPage(props: {
  searchParams?: Promise<{
    query?: string;
    page?: string;
    perPage?: string;
  }>
}) {
  const session = (await getSession()) as sessionType;
  const searchParams = await props.searchParams;
  const query = searchParams?.query || "";
  const currentPage = Number(searchParams?.page) || 1;
  const perPage = Number(searchParams?.perPage) || 10;

  const { tools, totalPages } = await getTools(query, currentPage, perPage, {});
  // console.log(tools);

  return (
    <div className="space-y-6 my-5">
      <div className="container mx-auto py-10 px-2">
        <Suspense fallback={<div>Loading...</div>}>
          <DataTable
            columns={columns}
            data={tools}
            header={
              <>
                <div>
                  <h2 className="text-2xl font-semibold">Tools</h2>
                  <p className="text-gray-500 text-sm">
                    {currentPage} of {totalPages} pages
                  </p>
                </div>
              </>
            }
          />
        </Suspense>
      </div>
    </div>
  );
}
