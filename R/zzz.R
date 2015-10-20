dcmap.caps <- NULL

.onLoad <- function(libname, pkgname)
{
  f <- function(module.name, module.path) {
    path <- system.file("javascript", module.path, package="rcloud.dcmap")
    caps <- rcloud.install.js.module(module.name,
                                     paste(readLines(path), collapse='\n'))
    caps
  }
  dcmap.caps <<- f("rcloud.dcmap", "rcloud.dcmap.js")
  ## if(!is.null(dcmap.caps)) {
  ##   dcmap.caps$init()
  ## }
  rcloud.install.css("/shared.R/rcloud.dcmap/leaflet.css")
  rcloud.install.css("/shared.R/rcloud.dcmap/leaflet-legend.css")
}
