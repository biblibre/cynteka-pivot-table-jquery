/* Cynteka Pivot JQuery Plugin.
 * Copyright (C) Cynteka http://www.cynteka.com, 2011-2014
 * Author Sergey Grigorchuk sng@cynteka.com, sergey.grigorchuk@gmail.com
 */
(function ($) {
  var methods = {
    init: function (options) {
      var opts = $.extend({}, $.fn.cypivot.defaults, options)

      var outThis = this
      if (opts.resizable) {
        $(window).resize(function () {
          if (opts.resizableWidth) {
            doResizeWidth(outThis)
          }
          if (opts.resizableHeight) {
            doResizeHeight(outThis)
          }
        })
      }
      var res = this.each(function () {
        var $this = $(this)
        $this.data('cypivot', {
          target: $this,
          options: opts
        })

        if (opts.localStoragePrefix && opts.storeDimConfig) {
          var sHorizontalDims = localStorage.getItem(opts.localStoragePrefix + 'horizontalDims')
          var sVerticalDims = localStorage.getItem(opts.localStoragePrefix + 'verticalDims')
          var sFilterDims = localStorage.getItem(opts.localStoragePrefix + 'filterDims')
          if (sHorizontalDims && hasAllDims(opts.dimensions, sHorizontalDims) && hasAllDims(opts.dimensions, sVerticalDims)) { opts.horizontalDimensions = sHorizontalDims.split(';') }
          if (sVerticalDims && hasAllDims(opts.dimensions, sHorizontalDims) && hasAllDims(opts.dimensions, sVerticalDims)) { opts.verticalDimensions = sVerticalDims.split(';') }
          if (sFilterDims && hasAllDims(opts.dimensions, sFilterDims) && hasAllDims(opts.dimensions, sFilterDims)) { opts.filterDimensions = sFilterDims.split(';') }
        }

        var configurationHtml = ''
        var configurationDialogHtml = ''
        if (opts.configuration) {
          configurationHtml = '<div class="' + opts.div11Class + '">' + opts.configLabel + '</div>'
          if (document.getElementById(opts.pivotConfigDialogId) === null) {
            configurationDialogHtml = '<div id="' + opts.pivotConfigDialogId + '" class="' + opts.configDialogClass + '"></div>'
          }
        }
        $this.html('' +
              '<table class="' + opts.tableClass + '">' +
              '  <tr class="' + opts.topRowClass + '">' +
              '    <td class="' + opts.cell11Class + '">' +
              configurationHtml +
              '    </td>' +
              '    <td class="' + opts.cell12Class + '">' +
              '      <div class="' + opts.div12Class + '">' +
              '      </div>' +
              '    </td>' +
              '  </tr>' +
              '  <tr class="' + opts.bottomRowClass + '">' +
              '    <td class="' + opts.cell21Class + '">' +
              '      <div class="' + opts.div21Class + '">' +
              '      </div>' +
              '    </td>' +
              '    <td class="' + opts.cell22Class + '">' +
              '      <div class="' + opts.div22Class + '-super">' +
              '      <div class="' + opts.div22Class + '">' +
              '        <table class="' + opts.pivotDataTableClass + '">' +
              '      </div>' +
              '      </div>' +
              '    </td>' +
              '  </tr>' +
              '</table>' +
              configurationDialogHtml
        )

        // Size/scroll synchronization  init
        $this.find('.' + opts.div22Class).on('scroll', function () {
          syncScrollAndSize($this, opts)
        })
        $this.find('.' + opts.cell22Class).resize(function () {
          syncScrollAndSize($this, opts)
        })
        if (opts.configuration) {
          var instance = $this.find('#' + opts.pivotConfigDialogId).dialog('instance')
          if (typeof instance === 'undefined') {
            $this.find('.' + opts.div11Class).on('click', function () {
              toggleConfig($this, opts)
            })
            createConfigDialog($this, opts)
            $this.find('#' + opts.pivotConfigDialogId).dialog({
              modal: false,
              title: 'Pivot Table Configuration',
              position: ['right', '50px'],
              autoOpen: false,
              beforeClose: function () {
                var $div11 = $this.find('.' + opts.div11Class)
                $div11.removeClass(opts.configWindowActivatedClass)
              }
            })
          }
        }

        syncScrollAndSize($this, opts)
        incrementalDraw($this, [], [opts.verticalDimensions[0], opts.horizontalDimensions[0]], 0, 0, opts)
        initExpandListeners($this, opts)
      })
      if (opts.resizable) {
        if (opts.resizableWidth) {
          doResizeWidth(outThis)
        }
        if (opts.resizableHeight) {
          doResizeHeight(outThis)
        }
      }
      return res
    },

    options: function (newData, reasonCell) {
      var $this = $(this)
      var data = $this.data('cypivot')
      return data.options
    },

    reload: function (newData, reasonCell) {
      return this.each(function () {
        var $this = $(this)
        var data = $this.data('cypivot')
        if (newData) { data.options.data = newData }

        if (reasonCell) {
          var $dataTable = $this.find('.' + data.options.div22Class + ' .' + data.options.pivotDataTableClass)
          var dataTable = $dataTable[0]
          for (var rowIdx = 0; rowIdx < dataTable.rows.length; rowIdx++) {
            var row = dataTable.rows[rowIdx]
            for (var colIdx = 0; colIdx < row.cells.length; colIdx++) {
              var cell = row.cells[colIdx]
              if (isSubContext(cell.colContext, reasonCell.colContext) &&
                       isSubContext(cell.rowContext, reasonCell.rowContext)) {
                cell.isCalculated = false
              }
            }
          }
          fillDataValues($this, data.options)
        } else {
          fillDataValues($this, data.options, true)
        }
      })
    },

    reconfig: function (newOpts) {
      var opts = $.extend({}, $.fn.cypivot.defaults, newOpts)
      var $this = $(this)
      redraw($this, opts)
    }

  }

  $.fn.cypivot = function (method) {
    // Method calling logic
    if (methods[method]) {
      return methods[ method ].apply(this, Array.prototype.slice.call(arguments, 1))
    } else if (typeof method === 'object' || !method) {
      return methods.init.apply(this, arguments)
    } else {
      $.error('Method ' + method + ' does not exist on jQuery.tooltip')
    }
  }

  function incrementalDraw ($table, dimensions, context, row, col, opts) {
    // Prepare callback that will be invoked when data is ready
    var callBack = function (curData) {
      var dimName = opts.verticalDimensions[0]
      var values = getDataValues(curData, context, dimName, '')
      // drawDimension($div, opts, dimensions, context, curData) // fffff

      var $pivotDataTable = $table.find('.' + opts.div22Class + ' .' + opts.pivotDataTableClass)

      var $horizontalDimDiv = $table.find('.' + opts.div21Class)
      values = drawDimension($horizontalDimDiv, opts, opts.horizontalDimensions, [], curData)
      insertRows($pivotDataTable[0], opts, 0, values.length)

      var $verticalDimDiv = $table.find('.' + opts.div12Class)
      values = drawDimension($verticalDimDiv, opts, opts.verticalDimensions, [], curData)
      insertColumns($pivotDataTable[0], opts, 0, values.length, curData)

      syncDimensionsSizes($table, opts)
    }

    // Trying to get current data
    var curData = opts.dataProvider(opts, dimensions, context, callBack)

    if (curData) {
      // If method returns data - display it
      callBack(curData)
    }
  }

  function createConfigDialog ($table, opts) {
    var $dialog = $table.find('.' + opts.configDialogClass)
    var busyDims = {}

    var verticalDimensionsHtml = '<li class="' + opts.dimensionListTitleClass + '" vdims="true">' + opts.verticalDimensionListTitle + '</li>'
    for (var i = 0; i < opts.verticalDimensions.length; i++) {
      var key = opts.verticalDimensions[i]
      busyDims[key] = true
      var dim = opts.dimensions[key]
      verticalDimensionsHtml = verticalDimensionsHtml + '<li dim="' + key + '">' + dim.label + '</li>'
    }
    if (!opts.configuration || !opts.configuration.verticalDimensions) {
      verticalDimensionsHtml = ''
    }

    var horizontalDimensionsHtml = '<li class="' + opts.dimensionListTitleClass + '" hdims="true">' + opts.horizontalDimensionListTitle + '</li>'
    for (i = 0; i < opts.horizontalDimensions.length; i++) {
      key = opts.horizontalDimensions[i]
      busyDims[key] = true
      dim = opts.dimensions[key]
      horizontalDimensionsHtml = horizontalDimensionsHtml + '<li dim="' + key + '">' + dim.label + '</li>'
    }
    if (!opts.configuration || !opts.configuration.horizontalDimensions) {
      horizontalDimensionsHtml = ''
    }

    var filterDimensionsHtml = '<li class="' + opts.dimensionListTitleClass + '" fdims="true">' + opts.filterDimensionListTitle + '</li>'
    for (i = 0; i < opts.filterDimensions.length; i++) {
      key = opts.filterDimensions[i]
      busyDims[key] = true
      dim = opts.dimensions[key]
      var filterValues = getDataValues(opts, [], key, '')

      var filterValuesHtml = '<ul>'
      for (var idx = 0; idx < filterValues.length; idx++) {
        var filterValue = filterValues[idx]
        filterValuesHtml = filterValuesHtml + "<li><input type='checkbox' value='" + filterValue.id + "'/>" + filterValue.label + '</li>'
      }
      filterValuesHtml = filterValuesHtml + '</ul>'

      filterDimensionsHtml = filterDimensionsHtml + '<li dim="' + key + '">' + dim.label +
      filterValuesHtml +
      '</li>'
    }
    if (!opts.configuration || !opts.configuration.filterDimensions) {
      filterDimensionsHtml = ''
    }

    var dimensionsHtml = ''
    for (key in opts.dimensions) {
      if (busyDims[key] !== true) {
        dim = opts.dimensions[key]
        dimensionsHtml = dimensionsHtml + '<li dim="' + key + '">' + dim.label + '</li>'
      }
    }

    $dialog.append(
      '<ul class="' + opts.firstDimensionListClass + '" style="padding-bottom:0px; margin-bottom:0px;">' +
        '<li class="' + opts.dimensionListTitleClass + '">' + opts.dimensionListTitle + '</li>' +
        '</ul>' +
        '<ul class="' + opts.dimensionListClass + '" style="padding-top:0px; margin-top:0px;">' +
        dimensionsHtml +
        horizontalDimensionsHtml +
        verticalDimensionsHtml +
        filterDimensionsHtml +
        '</ul>'
    )
    $dialog.find('ul.' + opts.dimensionListClass).sortable({
      cancel: '.' + opts.dimensionListTitleClass,
      update: function () {
        // Update pivot table when dimensions has been changed
        var vdims = []; var hdims = []; var fdims = []; var curdims = []
        $dialog.find('.' + opts.dimensionListClass + ' li').each(function () {
          var dim = $(this).attr('dim')
          if (dim) {
            curdims[curdims.length] = dim
          }
          if ($(this).attr('vdims') === 'true') {
            curdims = vdims
          }
          if ($(this).attr('hdims') === 'true') {
            curdims = hdims
          }
          if ($(this).attr('fdims') === 'true') {
            curdims = fdims
          }
        })
        if (opts.configuration && opts.configuration.verticalDimensions === true) {
          opts.verticalDimensions = vdims
        }
        if (opts.configuration && opts.configuration.horizontalDimensions === true) {
          opts.horizontalDimensions = hdims
        }
        if (opts.configuration && opts.configuration.filterDimensions === true) {
          opts.filterDimensions = fdims
        }
        if (opts.localStoragePrefix && opts.storeDimConfig) {
          var sHorizontalDims = opts.horizontalDimensions.join(';')
          var sVerticalDims = opts.verticalDimensions.join(';')
          var sFilterDims = opts.filterDimensions.join(';')
          localStorage.setItem(opts.localStoragePrefix + 'horizontalDims', sHorizontalDims)
          localStorage.setItem(opts.localStoragePrefix + 'verticalDims', sVerticalDims)
          localStorage.setItem(opts.localStoragePrefix + 'filterDims', sFilterDims)
        }
        redraw($table, opts)
      }
    })
  }

  function toggleConfig ($table, opts) {
    if (opts.configuration) {
      var $div11 = $table.find('.' + opts.div11Class)
      $div11.toggleClass(opts.configWindowActivatedClass)
      if ($div11.hasClass(opts.configWindowActivatedClass)) {
        $('#' + opts.pivotConfigDialogId).dialog('open')
      } else {
        var $dialog = $('#' + opts.pivotConfigDialogId)
        $dialog.dialog('close')
      }
    }
  }

  function getColIndex ($div, opts) {
    // Find Top level dimension div
    var $top
    if ($div.hasClass(opts.levelClassPrefix + '0')) {
      $top = $div.parent()
    } else {
      $top = $div.parents('.' + opts.levelClassPrefix + '0').parent()
    }
    var index = 0
    var found = false
    $top.find('.' + opts.dimLabelClass).each(function () {
      if (!found) {
        var $div0 = $div[0]
        if (this === $div0) {
          found = true
          return false
        } else {
          var $this = $(this)
          if ($this.parent().children('.' + opts.dimCellClass).length === 0) {
            index++
          }
        }
      }
    })
    return index
  }

  function getRowIndex ($div, opts) {
    // Find Top level dimension div
    var $top
    if ($div.hasClass(opts.levelClassPrefix + '0')) {
      $top = $div.parent()
    } else {
      $top = $div.parents('.' + opts.levelClassPrefix + '0').parent()
    }
    var index = 0
    var found = false
    $top.find('.' + opts.dimLabelClass).each(function () {
      if (!found) {
        var $div0 = $div[0]
        if (this === $div0) {
          found = true
          return false
        } else {
          index++
        }
      }
    })
    return index
  }

  function getRowContexts ($table, opts) {
    var contexts = []
    $table.find('.' + opts.div21Class + ' .' + opts.dimCellClass).each(function () {
      contexts[contexts.length] = this.pivotContext
    })
    return contexts
  }

  function getColContexts ($table, opts) {
    var contexts = []
    $table.find('.' + opts.div12Class + ' .' + opts.dimCellClass).not('.' + opts.expandedDimCellClass).each(function () {
      contexts[contexts.length] = this.pivotContext
    })
    return contexts
  }

  function dimColSubLevelCount ($div, opts) {
    // Find Top level dimension div
    var $top = $div.parent()
    var index = 0
    $top.find('.' + opts.dimLabelClass).each(function () {
      var $this = $(this)
      if ($this.parent().children('.' + opts.dimCellClass).length === 0) {
        index++
      }
    })
    return index
  }

  function dimRowSubLevelCount ($div, opts) {
    // Find Top level dimension div
    var $top = $div.parent()
    var index = 0
    var $div0 = $div[0]
    index = $top.find('.' + opts.dimLabelClass).not($div0).length
    return index
  }

  function redraw ($table, opts) {
    var $horizontalDimDiv = $table.find('.' + opts.div21Class)
    $horizontalDimDiv.html('')

    var $verticalDimDiv = $table.find('.' + opts.div12Class)
    $verticalDimDiv.html('')
    var $dataDimDiv = $table.find('.' + opts.div22Class)
    $dataDimDiv.html('<table class="' + opts.pivotDataTableClass + '">')
    incrementalDraw($table, [], [opts.verticalDimensions[0], opts.horizontalDimensions[0]], 0, 0, opts)
  }

  function initExpandListeners ($table, opts) {
    // Expand/Collapse column/row
    // Columns
    $table.on('click', '.' + opts.div12Class + ' .' + opts.dimLabelClass, function (event) {
      var $pivotDataTable = $table.find('.' + opts.div22Class + ' .' + opts.pivotDataTableClass)
      var onExpand, onCollapse
      var $this = $(this)
      var resync = false
      if ($this.hasClass(opts.expandedDimLabelClass)) {
        //  Collapse columns
        var countToDelete = dimColSubLevelCount($this, opts)
        if (countToDelete > 0) {
          var firstColumn = getColIndex($this, opts)
          var pivotDataTable = $pivotDataTable[0]
          var totalWidth = getTotalWidth(pivotDataTable, firstColumn, countToDelete - 1)

          // $this.parent().find('.' + opts.dimCellClass).animate({opacity:0}, 200);

          deleteColumns(pivotDataTable, firstColumn, countToDelete - 1, function () {
            $this.parent().find('.' + opts.dimCellClass).remove()

            $this.width(totalWidth + 'px')

            var width = -1
            for (var rowIdx = 0; rowIdx < pivotDataTable.rows.length; rowIdx++) {
              var row = pivotDataTable.rows[rowIdx]
              var cell = row.cells[firstColumn]
              if (width < 0) {
                width = $(cell).width()
              }
            }

            $this.removeClass(opts.expandedDimLabelClass).addClass(opts.collapsedDimLabelClass)
            $this.parent().removeClass(opts.expandedDimCellClass).addClass(opts.collapsedDimCellClass)

            fillDataValues($table, opts)
            syncDimensionsSizes($table, opts)
          })
        }
        onCollapse = opts.onCollapse
      } else if ($this.hasClass(opts.collapsedDimLabelClass)) {
        // Expand columns
        var pivotContext = this.parentElement.pivotContext
        var colIdx = getColIndex($this, opts)
        var $parent = $this.parent()

        var callBack = function (curData) {
          drawDimension($parent, opts, opts.verticalDimensions, null, curData)
          var colCount = dimColSubLevelCount($this, opts)
          if (colCount > 0) {
            $this.addClass(opts.expandedDimLabelClass).removeClass(opts.collapsedDimLabelClass)
            $this.parent().addClass(opts.expandedDimCellClass).removeClass(opts.collapsedDimCellClass)
            if (colCount > 0) {
              insertColumns($pivotDataTable[0], opts, colIdx, colCount - 1, curData)
            }
            resync = true
          }
          syncDimensionsSizes($table, opts)

          onExpand = opts.onExpand
        }
        // Create context
        var context = createProviderContext(pivotContext, opts.verticalDimensions)
        var visibleDims = getVisibleDimensions($table, opts)
        var maxLevel = getCurrentVerticalMaxLevel($table, opts)
        if (pivotContext.length === maxLevel) {
          visibleDims.push(opts.verticalDimensions[pivotContext.length])
        }

        var data = opts.dataProvider(opts, context, visibleDims, callBack)//  TODO
        if (data) {
          callBack(data)
        }
      }
      if (resync) {
        fillDataValues($table, opts)
        if (opts.resizable) {
          if (opts.resizableWidth) {
            doResizeWidth($table)
          }
          if (opts.resizableHeight) {
            doResizeHeight($table)
          }
        }
        if (onCollapse) {
          onCollapse(this)
        }
        if (onExpand) {
          onExpand(this)
        }
        syncDimensionsSizes($table, opts)
      }
      return false
    })
    // Rows
    $table.on('click', '.' + opts.div21Class + ' .' + opts.dimLabelClass, function (event) {
      var $pivotDataTable = $table.find('.' + opts.div22Class + ' .' + opts.pivotDataTableClass)
      var onExpand, onCollapse
      if (event.isPropagationStopped()) { return }

      var $this = $(this)
      var $parent = $this.parent()
      var resync = false
      if ($this.hasClass(opts.expandedDimLabelClass)) {
        var countToDelete = dimRowSubLevelCount($this, opts)
        var firstRow = getRowIndex($this, opts)
        var pivotDataTable = $pivotDataTable[0]
        if (countToDelete > 0) {
          deleteRows(pivotDataTable, firstRow + 1, countToDelete)
          $parent.find('.' + opts.dimCellClass).remove()
          $this.removeClass(opts.expandedDimLabelClass)
          $this.addClass(opts.collapsedDimLabelClass)
          $parent.removeClass(opts.expandedDimCellClass)
          $parent.addClass(opts.collapsedDimCellClass)
          resync = true
        }
        onCollapse = opts.onCollapse
      } else if ($this.hasClass(opts.collapsedDimLabelClass)) {
        // Expand row
        var pivotContext = this.parentElement.pivotContext

        var rowIdx = getRowIndex($this, opts)
        var callBack = function (curData) {
          drawDimension($parent, opts, opts.horizontalDimensions, null, curData)
          $this.addClass(opts.expandedDimLabelClass).removeClass(opts.collapsedDimLabelClass)
          $parent.addClass(opts.expandedDimCellClass).removeClass(opts.collapsedDimCellClass)
          var rowCount = dimRowSubLevelCount($this, opts)
          if (rowCount > 0) {
            insertRows($pivotDataTable[0], opts, rowIdx + 1, rowCount, curData)
            resync = true
          }
          syncDimensionsSizes($table, opts)

          onExpand = opts.onExpand
        }

        // Create context
        var context = createProviderContext(pivotContext, opts.horizontalDimensions)
        var visibleDims = getVisibleDimensions($table, opts)
        var maxLevel = getCurrentHorizontalMaxLevel($table, opts)
        if (pivotContext.length === maxLevel) {
          visibleDims.push(opts.horizontalDimensions[pivotContext.length])
        }

        var data = opts.dataProvider(opts, context, visibleDims, callBack)//  TODO
        if (data) {
          callBack(data)
        }

        onExpand = opts.onExpand
      }
      if (resync) {
        if (opts.resizable) {
          if (opts.resizableWidth) {
            doResizeWidth($table)
          }
          if (opts.resizableHeight) {
            doResizeHeight($table)
          }
          // doResize($table);
        }
        fillDataValues($table, opts)
        if (onCollapse) {
          onCollapse(this)
        }
        if (onExpand) {
          onExpand(this)
        }
        syncDimensionsSizes($table, opts)
      }
      return false
    })
  }

  function createProviderContext (pivotContext, dimensions) {
    var res = {}
    for (var i = 0; i < pivotContext.length; i++) {
      res[dimensions[i]] = pivotContext[i]
    }
    return res
  }

  function getVisibleDimensions ($table, opts) {
    var res = []
    getInnerVisibleDimensions($table, opts, opts.div21Class, opts.horizontalDimensions, res)
    getInnerVisibleDimensions($table, opts, opts.div12Class, opts.verticalDimensions, res)
    return res
  }

  function getInnerVisibleDimensions ($table, opts, selector, dimensions, res) {
    var max = 0
    $table.find('.' + selector + ' .' + opts.dimCellClass).each(function () {
      if (max < this.pivotContext.length) { max = this.pivotContext.length }
    })
    for (var i = 0; i < max; i++) {
      res.push(dimensions[i])
    }
  }

  /**
   * Calclulates max expanded level for vertical dimensions
   */
  function getCurrentVerticalMaxLevel ($table, opts) {
    var max = 0
    $table.find('.' + opts.div12Class + ' .' + opts.dimCellClass).each(function () {
      if (max < this.pivotContext.length) { max = this.pivotContext.length }
    })
    return max
  }

  /**
   * Calclulates max expanded level for horizontal dimensions
   */
  function getCurrentHorizontalMaxLevel ($table, opts) {
    var max = 0
    $table.find('.' + opts.div21Class + ' .' + opts.dimCellClass).each(function () {
      if (max < this.pivotContext.length) { max = this.pivotContext.length }
    })
    return max
  }

  function getTotalWidth (table, firstColumn, columnCount) {
    var res = 0
    var row = table.rows[0]
    for (var i = 0; i < columnCount; i++) {
      var cell = row.cells[firstColumn + i]
      var width = $(cell).width()
      res += width
    }
    return res
  }

  function fillDataValues ($table, opts, force) {
    var rowContexts = getRowContexts($table, opts)
    var colContexts = getColContexts($table, opts)
    var $dataTable = $table.find('.' + opts.div22Class + ' .' + opts.pivotDataTableClass)
    var dataTable = $dataTable[0]
    var rowItems
    for (var rowIdx = 0; rowIdx < dataTable.rows.length; rowIdx++) {
      var row = dataTable.rows[rowIdx]
      var rowContext = rowContexts[rowIdx]
      rowItems = null
      for (var colIdx = 0; colIdx < row.cells.length; colIdx++) {
        var colContext = colContexts[colIdx]
        var cell = row.cells[colIdx]
        cell.colContext = colContext
        cell.rowContext = rowContext
        if (cell.isCalculated !== true || force === true) {
          if (rowItems == null) {
            rowItems = opts.map(rowContext, [], opts.data)
          }
          var maps = opts.map(rowContext, colContext, rowItems['default'])
          var reduces = opts.reduce(maps)
          var html = ''
          if (opts.dataCellRenderer) {
            html = opts.dataCellRenderer(reduces, colContext, rowContext, opts)
          } else if ($('#cellTemplate').length > 0) {
            var template = $('#cellTemplate').html()
            html = _.template(template, { items: reduces, rowContext: rowContext, colContext: colContext, options: opts })
          }
          $(cell).html('<div class="' + opts.divDataCellClass + '">' + html + '</div>')
          cell.isCalculated = true
        }
      }
    }
  }

  function insertColumns (table, opts, startColumnIdx, columnCount, curData) {
    var $table = $(table)
    var rowContexts = getRowContexts($table.parents('.cypivot'), opts)
    var colContexts = getColContexts($table.parents('.cypivot'), opts)

    for (var rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
      var row = table.rows[rowIdx]
      var rowContext = rowContexts[rowIdx]
      for (var colCount = 0; colCount < columnCount; colCount++) {
        var colContext = colContexts[startColumnIdx + colCount]

        var cell = row.insertCell(startColumnIdx + colCount)
        cell.className = opts.dataCellClass
        var cellDiv = document.createElement('div')
        cell.appendChild(cellDiv)
        cellDiv.className = opts.divDataCellClass

        var maps = opts.map(rowContext, colContext, curData)
        var reduces = opts.reduce(maps)
        var html = ''
        if (opts.dataCellRenderer) {
          html = opts.dataCellRenderer(reduces, colContext, rowContext, opts)
        }
        $(cellDiv).html(html)
      }
    }
  }

  function insertRows (table, opts, startRowIdx, rowCount, curData) {
    var $table = $(table)
    var rowContexts = getRowContexts($table.parents('.cypivot'), opts)
    var colContexts = getColContexts($table.parents('.cypivot'), opts)

    var firstRow = table.rows.length > 0 ? table.rows[0] : null
    for (var rowIdx = 0; rowIdx < rowCount; rowIdx++) {
      var row = table.insertRow(startRowIdx + rowIdx)
      var rowContext = rowContexts[startRowIdx + rowIdx]
      var html = []
      if (firstRow) { // When we add to empty table firstRow is null
        for (var colIdx = 0; colIdx < firstRow.cells.length; colIdx++) {
          var colContext = colContexts[colIdx]

          var maps = opts.map(rowContext, colContext, curData)
          var reduces = opts.reduce(maps)
          var cellHtml = ''
          if (opts.dataCellRenderer) {
            cellHtml = opts.dataCellRenderer(reduces, colContext, rowContext, opts)
          }

          html.push('<td class="' + opts.dataCellClass + '"><div class="' + opts.divDataCellClass + '">' + cellHtml + '</div></td>')
        }
      }
      $(row).html(html.join(''))
    }
  }

  function deleteColumns (table, startColumnIdx, columnCount, finalizer) {
    for (var rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
      var row = table.rows[rowIdx]
      for (var colCount = 0; colCount < columnCount; colCount++) {
        row.deleteCell(startColumnIdx)
      }
    }

    if (finalizer) {
      finalizer()
    }
  }

  function deleteRows (table, startRowIdx, rowCount) {
    for (var rowIdx = 0; rowIdx < rowCount; rowIdx++) {
      table.deleteRow(startRowIdx)
    }
  }

  function syncDimensionsSizes ($table, opts) {
    if (opts.syncDimensionCellSizes) {
      syncRowsHeight($table, opts)
      syncColumnsWidth($table, opts)
    }
  }

  function syncColumnsWidth ($table, opts) {
    var $pivotDataTable = $table.find('.' + opts.div22Class + ' .' + opts.pivotDataTableClass)
    var pivotDataTable = $pivotDataTable[0]
    var firstRow = pivotDataTable.rows[0]

    var i = 0
    if (firstRow) {
      $table.find('.' + opts.dimLabelClass).each(function () {
        var $dimLabelDiv = $(this)
        if ($dimLabelDiv.hasClass(opts.expandedDimLabelClass)) {
          $dimLabelDiv.parent().css({ width: 'auto' })
        } else {
          var cell = firstRow.cells[i]
          var $td = $(cell)
          $dimLabelDiv.css('width', 'auto')
          var newWidth = ($td.outerWidth()) + 'px'

          if (i < firstRow.cells.length - 1) {
            var nextCell = firstRow.cells[i + 1]
            var $nextTd = $(nextCell)

            var position = $td.position()
            var nextPosition = $nextTd.position()
            newWidth = nextPosition.left - position.left
          }

          $dimLabelDiv.parent().css({ width: newWidth })
          i++
        }
      })
    }
  }

  function syncRowsHeight ($table, opts) {
    var $pivotDataTable = $table.find('.' + opts.div22Class + ' .' + opts.pivotDataTableClass)
    var pivotDataTable = $pivotDataTable[0]

    var i = 0
    $table.find('.' + opts.div21Class + ' .' + opts.dimLabelClass)/* .not('.' + opts.expandedDimLabelClass) */.each(function () {
      var row = pivotDataTable.rows[i]
      var $tr = $(row)
      var $dimLabelDiv = $(this)
      var newHeight = $tr.outerHeight() + 'px'
      $dimLabelDiv.css({ height: newHeight })
      i++
    })
  }

  function getDataValues (dimData, context, dimName, sortFieldName) {
    var items = []
    for (var i = 0; i < dimData.length; i++) {
      var item = dimData[i]
      if (applyDataFilter(item, context)) {
        items.push(item)
      }
    }
    var res = []
    var exist = {}
    for (i = 0; i < items.length; i++) {
      item = items[i]
      var value = item[dimName]
      var valueId = typeof (value) === 'object' ? value.id : value
      if (value && value !== Number.POSITIVE_INFINITY && !exist[valueId]) {
        exist[valueId] = true
        res.push(value)
      }
    }

    if (sortFieldName !== undefined) {
      res = res.sort(function (o1, o2) {
        if (o1[sortFieldName] < o2[sortFieldName]) { return -1 }
        if (o1[sortFieldName] > o2[sortFieldName]) { return 1 }
        return 0
      })
    }
    return res
  }

  function applyDataFilter (test, filter) {
    for (var key in filter) {
      var filterItem = filter[key]
      var dimName = filterItem.dimName
      var o1 = filterItem.id
      var testItem = test[dimName]
      if (testItem !== undefined) {
        var o2
        if (typeof testItem === 'number') {
          o2 = testItem
        } else if (typeof testItem === 'string') {
          o2 = testItem
        } else {
          o2 = testItem.id
        }
        if (o2 !== null && o2 !== undefined) {
          if (o1 !== o2 && o2 !== Number.POSITIVE_INFINITY) {
            return false
          }
        }
      }
    }
    return true
  }

  /**
   * Draws dimensions.
   * @param $div - jQuery html element which is clicked and should be displayed or whole dimensions panel so root dimensions will be displayed
   * @param opts - pivot table options
   * @param dimensions - dimensions
   * @param context - context
   * @param curData - current data  array
   * @returns values which were added as dimension labels
   */
  function drawDimension ($div, opts, dimensions, context, curData) {
    var res
    if (!context) {
      context = $div[0].pivotContext
    } else {
      $div[0].pivotContext = clone(context)
    }
    var dimName = dimensions[context.length]
    var newContext = clone(context)

    var dim = opts.dimensions[dimName]
    var $totalDiv = $div.find('.' + opts.dimTotalCellClass)
    if (dim) {
      var values = dim.values ? dim.values(context) : getDataValues(curData, context, dimName, dim.sortFieldName)
      res = values
      if (values.length > 0) {
        $div.children('.' + opts.dimLabelClass).css({ width: '' })
      }
      for (var valIdx = 0; valIdx < values.length; valIdx++) {
        var value = values[valIdx]
        var valueId = typeof (value) === 'object' ? value.id : value
        var valueLabel = typeof (value) === 'object' ? value.label : value
        value = typeof (value) === 'object' ? value : { id: value, label: value }
        value.dimName = dimName
        newContext[context.length] = value
        var dimCellDiv = document.createElement('div')
        if ($totalDiv.length > 0) {
          dimCellDiv = $div[0].insertBefore(dimCellDiv, $totalDiv[0])
        } else {
          dimCellDiv = $div[0].appendChild(dimCellDiv)
        }
        var $dimCellDiv = $(dimCellDiv)
        $dimCellDiv.addClass(opts.dimCellClass + ' ' + opts.dimCellClass + '-' + dimName + ' ' + opts.levelClassPrefix + context.length + ' ' +
            opts.pivotIdClassPrefix + valueId)
        $dimCellDiv.attr({
          'pivotId': valueId,
          'dimName': dimName,
          'title': dim.label + ' : ' + unescape(valueLabel)
        })
        var cellHtml = opts.dimensionCellRenderer ? opts.dimensionCellRenderer(opts, newContext, false) : "<span title='" + dim.label + ': ' +
            valueLabel + "'>" + "<i class='" + opts.dimCellIconClass + "'></i>" + valueLabel + '</span>'
        $dimCellDiv.append('<div class="' + opts.dimLabelClass + ' ' + opts.dimLabelClass + '-' + dimName + ' ' +
            (dim.className ? dim.className + ' ' : '') +
            (newContext.length < dimensions.length ? opts.expandableDimLabelClass : '') +
            '">' + cellHtml +
            '</div>')

        var $divLabel = $dimCellDiv.children('.' + opts.dimLabelClass)
        dimCellDiv.pivotContext = clone(newContext)

        if (opts.isExpanded(newContext) && newContext.length < dimensions.length) {
          $divLabel.addClass(opts.expandedDimLabelClass)
          $divLabel.parent().addClass(opts.expandedDimCellClass)
          var $childDiv = $div.children('.' + opts.pivotIdClassPrefix + valueId)
          drawDimension($childDiv, opts, dimensions, newContext, curData)
        } else {
          if (newContext.length < dimensions.length) {
            $divLabel.addClass(opts.collapsedDimLabelClass)
            $divLabel.parent().addClass(opts.collapsedDimCellClass)
          }
        }
      }

      // Show total column if it does not exist, if it's not top level and it's vertical
      if ($totalDiv.length === 0 && context.length > 0 && dimensions === opts.verticalDimensions) {
        dimCellDiv = document.createElement('div')
        dimCellDiv = $div[0].appendChild(dimCellDiv)
        $dimCellDiv = $(dimCellDiv)
        $dimCellDiv.addClass(opts.dimCellClass)
        $dimCellDiv.addClass(opts.dimTotalCellClass)
        $dimCellDiv.addClass(opts.levelClassPrefix + context.length)
        $dimCellDiv.attr('dimName', dimName)
        dimCellDiv.pivotContext = clone(context)

        $dimCellDiv.append('<div class="' +
            opts.dimLabelClass + '">' + 'Total' + '</div>')
      }
    }
    return res
  }

  /**
   * Synchronizes sizes and scroll position of fixed columns with pivot itself.
   */
  function syncScrollAndSize ($table, opts) {
    var scrollBarWidth = getScrollBarWidth()
    var $div22 = $table.find('.' + opts.div22Class)

    if (!opts.autoSize) {
      $table.find('.' + opts.div21Class).css({
        'margin-bottom': scrollBarWidth + 'px'
      })
    }
    $table.find('.' + opts.div12Class).scrollLeft($div22.scrollLeft())
    $table.find('.' + opts.div21Class).scrollTop($div22.scrollTop())
  }

  $.fn.cypivot.defaults = {

    // Specifies if size of dimension sizes must be synced. Sometimes it should be false, if block sizes are equals
    // and specified in CSS. In this case pivot table works faster.
    syncDimensionCellSizes: true,

    // Specifies if pivot table should be resize when window is resized.
    resizable: true,
    resizableWidth: true,
    resizableHeight: true,
    autoSize: false,

    // Default classes
    tableClass: 'cypivot',
    topRowClass: 'top-row',
    bottomRowClass: 'bottom-row',
    cell11Class: 'cell11',
    cell12Class: 'cell12',
    cell21Class: 'cell21',
    cell22Class: 'cell22',

    div11Class: 'div11',
    div12Class: 'div12',
    div21Class: 'div21',
    div22Class: 'div22',

    pivotDataTableClass: 'pivot-data-table',
    dimLabelClass: 'dim-label',
    dimCellIconClass: 'dim-cell-icon',

    dimCellClass: 'dim-cell',
    expandableDimLabelClass: 'expandable-dim-label',
    expandedDimLabelClass: 'expanded-dim-label',
    collapsedDimLabelClass: 'collapsed-dim-label',
    expandedDimCellClass: 'expanded-dim-cell',
    collapsedDimCellClass: 'collapsed-dim-cell',
    dimTotalCellClass: 'dim-total-cell',
    dataTotalCellClass: 'data-total-cell',
    levelClassPrefix: 'level-',

    dataRowClass: 'data-row',
    dataCellClass: 'data-cell',
    divDataCellClass: 'div-data-cell',
    configDialogClass: 'config-dialog',

    dimensionListTitle: 'Dimensions',
    horizontalDimensionListTitle: 'Rows',
    verticalDimensionListTitle: 'Columns',
    filterDimensionListTitle: 'Filters',

    configWindowActivatedClass: 'config-window-activated',
    dimensionListClass: 'dimension-list',
    firstDimensionListClass: 'first-dimension-list',
    dimensionListTitleClass: 'dimension-list-title',
    verticalDimensionListClass: 'vertical-dimension-list',
    horizontalDimensionListClass: 'horizontal-dimension-list',
    filterDimensionListClass: 'filter-dimension-list',

    pivotIdClassPrefix: 'pivot-id-',
    pivotConfigDialogId: 'pivot-config-dialog',

    isExpanded: function (context) {
      return context.length === 0
    },

    configuration: {
      horizontalDimensions: true,
      verticalDimensions: true,
      filterDimensions: false
    },

    configLabel: 'Config',

    localStoragePrefix: 'cy-pivot-',
    storeDimConfig: true,

    dataCellRenderer: function (items, colContext, rowContext, opts) {
      var value = ''
      for (var i = 0; i < opts.valueDataFields.length; i++) {
        var valueDataField = opts.valueDataFields[i]
        value = value + "<span class='value-" + valueDataField + "'>" + items['default'].sum[valueDataField] + '</span> '
      }
      return value
    },

    dataProvider: // null,
    function (opts, context, visibleDims) {
      return opts.data
    },

    dimensionCellRenderer: null, // This function(opts, context, isTotal) should render dimension cell

    dimensions: {
      dim1:
      {
        label: 'Colors',
        values: function (context) {
          return [{ id: 1, label: 'Red' }, { id: 2, label: 'Blue' }, { id: 3, label: 'Green' }]
        },
        showTotal: true
      },
      dim2:
      {
        label: 'Cities',
        values: function (context) {
          return [{ id: 1, label: 'Saint-Petersburg' }, { id: 2, label: 'Moscow' }, { id: 3, label: 'London' }, { id: 4, label: 'Paris' }]
        },
        showTotal: true
      },
      dim3:
      {
        label: 'Shapes',
        values: function (context) {
          return [{ id: 1, label: 'Round' }, { id: 2, label: 'Square' }, { id: 3, label: 'Star' }, { id: 4, label: 'Ellipse' }]
        },
        showTotal: true
      },
      dim4:
      {
        label: 'Planets',
        values: function (context) {
          return [{ id: 1, label: 'Earth' }, { id: 2, label: 'Moon' }, { id: 3, label: 'Mars' }, { id: 4, label: 'Neptune' }]
        },
        showTotal: true
      },
      dim5:
      {
        label: 'Geo',
        values: function (context) {
          return [{ id: 1, label: 'Asia' }, { id: 2, label: 'Africa' }, { id: 3, label: 'Europe' }, { id: 4, label: 'America' }]
        },
        showTotal: true
      },
      dim6:
      {
        label: 'Lessons',
        values: function (context) {
          return [{ id: 1, label: 'Phisics' }, { id: 2, label: 'Chemistry' }, { id: 3, label: 'Math' }, { id: 4, label: 'Geography' }]
        },
        showTotal: true
      }
    },

    horizontalDimensions: ['dim1', 'dim3', 'dim5'],
    verticalDimensions: ['dim2'],
    filterDimensions: [],

    data: [
      {
        dim1: 'Red',
        dim2: 'Saint-Petersburg',
        dim3: 'Round',
        dim4: 'Earth',
        dim5: 'Asia',
        dim6: 'Phisics',
        value: 1
      },
      {
        dim1: 'Red',
        dim2: 'Saint-Petersburg',
        dim3: 'Round',
        dim4: 'Earth',
        dim5: 'Asia',
        dim6: 'Chemistry',
        value: 1
      },
      {
        dim1: 'Blue',
        dim2: 'Saint-Petersburg',
        dim3: 'Round',
        dim4: 'Earth',
        dim5: 'Asia',
        dim6: 'Chemistry',
        value: 1
      },
      {
        dim1: 'Green',
        dim2: 'Moscow',
        dim3: 'Round',
        dim4: 'Earth',
        dim5: 'Asia',
        dim6: 'Chemistry',
        value: 1
      }
    ],

    map: function (rowContext, colContext, data) {
      var res = []
      var strictedItems = []
      var filter = []
      for (var i = 0; i < rowContext.length; i++) {
        var value = rowContext[i]
        filter.push(value)
      }
      for (i = 0; i < colContext.length; i++) {
        value = colContext[i]
        filter.push(value)
      }

      for (i = 0; i < data.length; i++) {
        var item = data[i]
        if (applyFilter2(item, filter)) {
          res.push(item)
        }
        if (strictApplyFilter(this, item, filter)) {
          strictedItems[strictedItems.length] = item
        }
      }
      return {
        'default': res,
        stricted: strictedItems
      }
    },

    valueDataFields: ['value'],

    /* Reduces is an array of objects. Each object specifies what 'map' items it requires and it puts result(s) into reduces map.
     * So the only reduce function can calculate 'sum', 'max', 'min', 'avg', 'count' etc. values.
     */
    reduce: function (mapItems) {
      var reduces = {}

      for (var itemsKey in mapItems) {
        var items = mapItems[itemsKey]
        var sum = {}
        var max = {}; var min = {}

        for (var j = 0; j < this.valueDataFields.length; j++) {
          var valueDataField = this.valueDataFields[j]
          var curSum = 0
          var curMax = Number.NEGATIVE_INFINITY
          var curMin = Number.POSITIVE_INFINITY
          for (var i = 0; i < items.length; i++) {
            var item = items[i]
            var itemValue = item[valueDataField]

            curSum += itemValue
            if (curMin > itemValue) {
              curMin = itemValue
            }
            if (curMax < itemValue) {
              curMax = itemValue
            }
          }
          sum[valueDataField] = curSum
          max[valueDataField] = curMax
          min[valueDataField] = curMin
        }
        reduces[itemsKey] = {}
        reduces[itemsKey]['sum'] = sum
        reduces[itemsKey]['count'] = items.length
        reduces[itemsKey]['avg'] = sum / items.length
        reduces[itemsKey]['max'] = max
        reduces[itemsKey]['min'] = min
      }
      return reduces
    },

    reduces: [
      {
        valueDataFields: ['value'],
        map: 'default',
        reduce: function (items, reduces) {
          var sum = {}
          var count = {}
          for (var i = 0; i < this.valueDataFields.length; i++) {
            var valueDataField = this.valueDataFields[i]
            sum[valueDataField] = 0
            count[valueDataField] = items.length
          }
          var max = {}; var min = {}
          for (i = 0; i < items.length; i++) {
            var item = items[i]
            for (var j = 0; j < this.valueDataFields.length; j++) {
              valueDataField = this.valueDataFields[j]
              sum[valueDataField] += item[valueDataField]
              if (min[valueDataField]) {
                if (min[valueDataField] > item[valueDataField]) {
                  min[valueDataField] = item[valueDataField]
                }
              } else {
                min[valueDataField] = item[valueDataField]
              }
              if (max[valueDataField]) {
                if (max[valueDataField] > item[valueDataField]) {
                  max[valueDataField] = item[valueDataField]
                }
              } else {
                max[valueDataField] = item[valueDataField]
              }
            }
          }
          if (reduces) {
            reduces['sum'] = sum
            reduces['count'] = items.length
            reduces['avg'] = sum / items.length
            reduces['max'] = max
            reduces['min'] = min
          }
          return sum
        }
      }
    ]
  }

  function clone (o) {
    if (!o || typeof o !== 'object') {
      return o
    }
    var c = typeof o.pop === 'function' ? [] : {}
    var p, v
    for (p in o) {
      if (o.hasOwnProperty(p)) {
        v = o[p]
        if (v && typeof v === 'object') {
          c[p] = clone(v)
        } else {
          c[p] = v
        }
      }
    }
    return c
  }

  function applyFilter2 (test, filter) {
    for (var i = 0; i < filter.length; i++) {
      var filterItem = filter[i]
      var o2 = test[filterItem.dimName]
      if (typeof (o2) === 'object' && o2 != null) {
        o2 = o2.id
      }
      if (filterItem.id !== o2) {
        return false
      }
    }
    return true
  }

  /**
 * This function check if the test value contain ONLY filter values (so it's not on sublevel- it's on the same level)
 * @param test
 * @param filter
 * @returns {Boolean}
 */
  function strictApplyFilter (opts, test, filter) {
    var testFilter = {}
    for (var key in filter) {
      var filterItem = filter[key]
      var dimName = filterItem.dimName
      var o1 = filterItem.id
      var o2 = test[dimName]
      if (o1 !== o2) {
        return false
      }
      testFilter[dimName] = o1
    }
    for (key in opts.dimensions) {
      if (testFilter[key] === undefined) {
        if (test[key] !== undefined) { return false }
      }
    }
    return true
  }

  /**
 * Calculate width of scroll bar
 */
  function getScrollBarWidth () {
    var inner = document.createElement('p')
    inner.style.width = '100%'
    inner.style.height = '200px'

    var outer = document.createElement('div')
    outer.style.position = 'absolute'
    outer.style.top = '0px'
    outer.style.left = '0px'
    outer.style.visibility = 'hidden'
    outer.style.width = '200px'
    outer.style.height = '150px'
    outer.style.overflow = 'hidden'
    outer.appendChild(inner)

    document.body.appendChild(outer)
    var w1 = inner.offsetWidth
    outer.style.overflow = 'scroll'
    var w2 = inner.offsetWidth
    if (w1 === w2) { w2 = outer.clientWidth }

    document.body.removeChild(outer)

    return (w1 - w2)
  }

  function doResizeWidth ($table) {
    var left = $table.find('.div22').offset().left
    $table.find('.div22').css({
      width: (window.innerWidth - left) + 'px'
    })
  }

  function doResizeHeight ($table) {
    var top = $table.find('.div22').offset().top
    $table.find('.div22').css({
      height: (window.innerHeight - top) + 'px'
    })
    $table.find('.div21').css({
      height: (window.innerHeight - top) + 'px'
    })
  }

  // Checks if c2 is subcontext for c1 (all fields from c1 are equals to fields in c2)
  function isSubContext (c1, c2) {
    if (c2.length < c1.length) {
      return false
    }
    for (var i = 0; i < c1.length; i++) {
      if (c1[i].id !== c2[i].id) { return false }
    }
    return true
  }

  function hasAllDims (allDims, dims) {
    dims = dims.split(';')
    for (var i = 0; i < dims.length; i++) {
      var dimName = dims[i] // .trim();
      var value = allDims[dimName]
      if (value === undefined) {
        return false
      }
    }
    return true
  }
})(jQuery)
