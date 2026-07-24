// Concrete routes for the example `widget` module. The SKILL.md sketch leaves
// the /:id group methods as comments; this fills them all in, including the
// `/archive` state transition mapped to a 409 via ConflictException.
import Elysia from "elysia";
import {
  ConflictException,
  httpExceptionPlugin,
  InternalServerErrorException,
  NotFoundException,
} from "elysia-http-exception";
import z from "zod";

import { baseQuerySchema, paginationResponseSchema } from "../../lib/schema";
import { authPlugin } from "../auth/auth.plugin";
import { createWidgetSchema, selectWidgetSchema, updateWidgetSchema } from "./widget.schema";
import { WidgetService } from "./widget.service";

export const widgetRoutes = new Elysia({ name: "widget", prefix: "/widgets", tags: ["Widget"] })
  .use(authPlugin) // resolves organizationId/role/userId
  .use(httpExceptionPlugin()) // maps thrown exceptions to the right HTTP status
  .model({ Widget: selectWidgetSchema }) // keeps typed-client inference working
  .resolve(({ organizationId, role, userId }) => ({
    service: new WidgetService({ role, userId, organizationId }),
  }))
  .get(
    "",
    async ({ query, status, service }) => {
      const { page = 1, limit = 100 } = query;
      const data = await service.list({ page, limit });
      return status(200, { data, pagination: { currentPage: page, limit } });
    },
    {
      query: baseQuerySchema,
      response: {
        200: z.object({ data: z.array(selectWidgetSchema), pagination: paginationResponseSchema }),
      },
    },
  )
  .post(
    "",
    async ({ body, status, service }) => {
      const data = await service.create(body);
      if (!data) throw new InternalServerErrorException("Failed to create widget");
      return status(201, data);
    },
    { body: createWidgetSchema, response: { 201: selectWidgetSchema } },
  )
  .group("/:id", { params: z.object({ id: z.string() }) }, (app) =>
    app
      .get(
        "",
        async ({ params, status, service }) => {
          const data = await service.getById(params.id);
          if (!data) throw new NotFoundException("Widget not found");
          return status(200, data);
        },
        { response: { 200: selectWidgetSchema } },
      )
      .patch(
        "",
        async ({ params, body, status, service }) => {
          const data = await service.update(params.id, body);
          if (!data) throw new NotFoundException("Widget not found");
          return status(200, data);
        },
        { body: updateWidgetSchema, response: { 200: selectWidgetSchema } },
      )
      .delete(
        "",
        async ({ params, status, service }) => {
          const data = await service.remove(params.id);
          if (!data) throw new NotFoundException("Widget not found");
          return status(200, data);
        },
        { response: { 200: z.object({ id: z.string() }) } },
      )
      .post(
        "/archive",
        async ({ params, status, service }) => {
          const data = await service.archive(params.id);
          if (!data) throw new ConflictException("Widget is not active"); // precondition failed
          return status(200, data);
        },
        { response: { 200: selectWidgetSchema } },
      ),
  );
