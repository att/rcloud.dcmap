dcmap <- function(dimension, group, shape.url = NULL, width = 700, height = 450) {
  opts <- list(shape.url = shape.url, width = width, height = height)
  div.maker <- dcmap.caps$handle_dcmap(substitute(dimension), substitute(group), substitute(opts))
  deferred.rcloud.result(function() div.maker)
}
