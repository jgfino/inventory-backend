/**
 * Properties in a query for pagination
 */
type PaginationQuery = {
  /**
   * How to order results, either asc or desc
   */
  order?: string;
  /**
   * What field to sort by
   */
  sort?: string;
  /**
   * What document to start at
   */
  offset?: string;
  /**
   * The maximum number of documents to return
   */
  limit?: string;
  /**
   * A search query, if applicable
   */
  q?: string;
};

/**
 * Determines order, limit, and offset for a query
 * @param query The query to parse
 * @returns Order, limit, and offset.
 */
export const parsePaginationQuery = (
  query: PaginationQuery,
  defaultOrder: "asc" | "desc" = "asc",
  defaultLimit = 100
) => {
  let order: 1 | -1 = defaultOrder == "desc" ? -1 : 1;
  if (query.order && query.order == "desc") {
    order = -1;
  }

  const max = 100;
  let limit = defaultLimit;
  if (query.limit && !isNaN(Number(query.limit))) {
    limit = Math.min(Number(query.limit), max);
  }

  let offset = 0;
  if (query.offset && !isNaN(Number(query.offset))) {
    offset = Math.max(Number(query.offset), 0);
  }

  return { order, limit, offset };
};

/**
 * Options for
 */
type NestedArrayPipelineOptions = {
  /**
   * The name of the array field to use
   */
  arrayField: string;
  /**
   * The name of the field inside of the array to sort by
   */
  defaultSortField: string;
  /**
   * The default sort order
   */
  defaultOrder?: "asc" | "desc";
  /**
   * The field inside of the array to search on
   */
  searchField?: string;
};

/**
 * Creates a pipeline for sorting, searching, and paginating a nested array in
 * a document.
 * @param query The query to use
 * @param options The pipeline options
 * @returns A pipeline to use in aggregation
 */
export const paginateNestedArrayPipeline = (
  query: PaginationQuery,
  options: NestedArrayPipelineOptions
) => {
  const {
    arrayField,
    defaultSortField,
    defaultOrder = "asc",
    searchField,
  } = options;

  const sortField = query.sort
    ? `${String(arrayField)}.${String(query.sort)}`
    : `${String(arrayField)}.${defaultSortField}`;

  const { order, limit, offset } = parsePaginationQuery(query, defaultOrder);

  const pipeline: any = [
    { $unwind: { path: `$${arrayField}`, preserveNullAndEmptyArrays: true } },
    { $sort: { [sortField]: order } },
    {
      $group: {
        _id: "$_id",
        items: {
          $push: `$${arrayField}`,
        },
      },
    },
    {
      $project: {
        items: {
          $slice: [`$${arrayField}`, offset, limit],
        },
      },
    },
  ];

  if (query.q) {
    pipeline.splice(1, 0, {
      $match: {
        [`${String(arrayField)}.${String(searchField)}`]: new RegExp(
          String(query.q),
          "i"
        ),
      },
    });
  }

  return pipeline;
};
