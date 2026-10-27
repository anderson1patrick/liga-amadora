import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/c/$id/")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/c/$id/tabela", params: { id: params.id } });
  },
});
