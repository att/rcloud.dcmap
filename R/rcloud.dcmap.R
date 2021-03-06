dcmap <- function(dimension, group, ...) {
  ctx <- wdcplot.get.default.context()
  dim2 <- wdcplot.substitute(ctx, substitute(dimension))
  group2 <- wdcplot.substitute(ctx, substitute(group))
  opts2 <- wdcplot.substitute(ctx, substitute(list(...)))
  div.maker <- dcmap.caps$handle_dcmap(dim2, group2, opts2)
  deferred.rcloud.result(function() div.maker)
}
