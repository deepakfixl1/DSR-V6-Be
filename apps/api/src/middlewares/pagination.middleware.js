export const applyPagination = (defaults = {}) => {
  const defaultPage = Number(defaults.page ?? 1);
  const defaultLimit = Number(defaults.limit ?? 20);
  const maxLimit = Number(defaults.maxLimit ?? 100);

  return (req, _res, next) => {
    const source = req.validated?.query ?? req.query ?? {};
    const page = Math.max(1, Number(source.page ?? defaultPage));
    const limit = Math.min(maxLimit, Math.max(1, Number(source.limit ?? defaultLimit)));

    req.pagination = {
      page,
      limit,
      skip: (page - 1) * limit,
    };

    return next();
  };
};
