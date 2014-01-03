Ext.define('CV.controller.Library', {
  extend : 'Ext.app.Controller',
  models : [],
  stores : ['CV.store.FeatureCount', 'CV.store.Facets', 'CV.store.CvTerms', 'CV.store.Features'],
  views : ['CV.view.library.View'],
  requires : ['CV.config.ChadoViewer','CV.store.Features','CV.store.FeatureCount', 'CV.store.Facets', 'CV.store.CvTerms', 'CV.view.library.View','CV.ux.Router'],
  /*
   * libraryView will store the instance of the library view
   */
  libraryView : 'CV.view.library.View',
  // references to views that are controlled by this controller
  refs : [{
    ref : 'lib',
    selector : 'libraryview'//,
    //autoCreate : true
  }, {
    ref : 'tree',
    selector : 'libraryview dstree'
  }, {
    ref : 'sequencesGrid',
    selector : 'libraryview sequencesgrid'//,
    //autoCreate : true
  }, {
    ref : 'graphPanel',
    selector : 'libraryview cvtabs'
  }, {
    ref : 'metadataPanel',
    selector : 'libraryview metadatapanel'//,
    //autoCreate : true
  }, {
    ref : 'dsview',
    selector : 'libraryview dsview'//,
    // autoCreate : true
  }, {
    ref : 'cvtabs',
    selector : 'libraryview cvtabs'
  }, {
    ref : 'statuspanel',
    selector : 'libraryview panel[name=statuspanel]'
  }, {
    ref : 'annotationpanel',
    selector : 'libraryview tabpanel[name=annotationpanel]'
  },{
    ref: 'autoannotations',
    selector:'libraryview autoannotations'
  }],
  // config
  name : 'Library',
  text:'Protein Annotations',
  uri : 'library',
  libraryId : 'id',
  btnTooltip: 'Get a summary of transcripts based on experiments',
  //   this config decides if tree elements need to be selected
  item : null,
  init : function() {
    var treeView, gridView, controller = this;
    this.control({
      'libraryview dstree' : {
        // select:this.treeSelect,
        selectionchange: this.multiSelectUri,
        // select : this.updateUri,
        // load : this.selectNode
        load : this.selectNodes
      },
      'viewport radiogroup button[name=Library]' : {
        render : this.headerInit,
        scope : this
      },
      // 'libraryview rawdatapanel' : {
        // selectionchange : this.cvtermFilter,
        // scope : this
      // },
      'libraryview' : {
        facetschanged : this.onFacetsChanged
      },
      'libraryview chadopanel' : {
        filtercomplete : this.onFilterComplete
      }
    });
    if (CV.app.facets) {
      this.control({
        'libraryview rawdatapanel' : {
          selectionchange : function(rowmodel, recs) {
            if (recs.length) {
              controller.graphSelection(recs[0]);
            }
          }
        },
        'libraryview pieview' : {
          itemclicked : this.graphSelection,
          scope : this
        },
        'libraryview libraryBar' : {
          itemclicked : this.graphSelection,
          scope : this
        },
        'libraryview tagcloud' : {
          itemclicked : this.graphSelection,
          scope : this
        },
        'libraryview autoannotations':{
          select: this.autoSelect,
          scope: this
        }
      });
    }
    // Ext.create('CV.view.library.View');
  },
  /*
   * this config is used to store the button connected to this controller. In this case library. It can later be used to toggle button during render at init.
   */
  header : undefined,
  headerInit : function(btn) {
    this.header = btn;
  },
  show : function(params) {
    var view = this.getLib(), idList = params.id && JSON.parse(decodeURI(params.id));
    CV.config.ChadoViewer.self.selectedIds = idList;
    if (Ext.isString(this.libraryView)) {
      this.libraryView = this.getView(this.libraryView).create();
    }
    this.render(this.libraryView);
    this.clearSelection();
    if (idList && idList[0]) {
      this.enable();
      switch ( idList[0].type ) {
        case 'library':
          id = idList[0].id;
          // to make a selection
          this.libraryView.setConfig(CV.config.ChadoViewer.self.library);
          if ( typeof id !== 'undefined') {
            this.treeSelect(id, idList);
          }
          break;
        case 'species':
          id = idList[0].id;
          // change ds value in extra param
          this.libraryView.setConfig(CV.config.ChadoViewer.self.species);

          // tree select id
          if ( typeof id !== 'undefined') {
            this.treeSelect(id);
          }
          break;
      } 
    } else {
        this.disable();
    }
  },
  onFilterComplete : function() {
    var cvtabs = this.getCvtabs(), activeTab = cvtabs.getActiveTab(), cloud = activeTab && activeTab.down('tagcloud');
    cloud && cloud.draw();
  },
  onFacetsChanged : function() {
    var seqGrid = this.getSequencesGrid(), lib = this.getLib(), tabpanel = this.getCvtabs();
    seqGrid.getStore().loadPage(1);
    // load the graph( summary ) panels.
    // Ext.each( lib.facetsParamArray , function( store ){
    // store.load();
    // });
    // lib.refreshDsview();
    lib.isDefferedLoad();
    tabpanel.reload();
    // Ext.each( lib.cvPanels , function( tab ){
    // tab.reload();
    // });
  },
  graphSelection : function(slice) {
    var dsview = this.getLib(), tab = dsview.down('cvtabs').getActiveTab();
    if ( tab && ( tab.othersRec !== slice )) {
      dsview.facetsStore.loadData([{
        'cvterm_id' : slice.get('cvterm_id'),
        'name' : slice.get('name'),
        'cv_id' : slice.get('cv_id')
      }], true);

    }
  },
  multiSelectUri:function( rm, records, index ){
    var items = [], item, i, validate;
    if ( records.length ){
      for( i in records ) {
        record = records[i];
        item = {
          id : record.get(this.libraryId),
          type : record.get('type'),
          text : record.get('text')
        };
        items.push( item );
      }
      // item.id = record.get(this.libraryId),
      // item.type = 'library',
      
      url = this.uri + '/' + JSON.stringify(items);
      CV.config.ChadoViewer.self.currentUri = url;
      validate = this.validateSelection( items );
      if( validate ) {
        CV.ux.Router.redirect( url );
      }
    }
  },
  validateSelection: function( items ){
    var validate, item,i;
    validate = this.validateSameType( items );
    validate = validate && this.validateJustUnknow( items );
    return validate;
  },
  validateSameType:function( items ){
    var item, valid = true, prev;
    for( i in items ){
      item = items[i];
      prev = prev ? prev : items[0];
      valid &= ( item.type == prev.type );
      prev = item;
      if( !valid ){
        Ext.Msg.show({
          title:'Error!',
          msg:'Selection must be of the same type i.e. either all species or library.'
        });
        break;
      }
    }
    return valid;
  },
  validateJustUnknow:function( items ){
    var item, valid = true, isUnknown= false;
    for( i in items ){
      item = items[i];
      if( item.id < 0 ){
        isUnknown = true;
        break;
      }
    }
    if ( isUnknown && items.length > 1 ){
      valid = false;
      Ext.Msg.show({
        title:'Error!',
        msg:'Multiple selection cannot be made with Unknow'
      });
    }
    return valid;
  },
  updateUri : function(rm, record, index) {
    var item = {
      id : record.get(this.libraryId),
      type : record.get('type'),
      name : record.get('name')
    },
    url = this.uri + '/' + JSON.stringify([item]);
    CV.ux.Router.redirect(url);
  },
  treeSelect : function(item, idList) {
    var id, 
      value, 
      grid, 
      graph,
      graphStore,
      gridStore,
      itemRecord,
      panel,
      tree = this.getTree(), 
      sm = tree.getSelectionModel(), 
      view = this.getLib(),
      annot = this.getAutoannotations();

    panel = this.getLib();
    // panel.clearFacets(true);
    // make sure this is set since it will decide if the node is selected on tree panel.
    // It had to be done this way as some times tree takes long time to load. Hence search returns null.
    this.item = item;
    
    // this.selectNode();
    this.selectNodes( idList );
    grid = this.getSequencesGrid();

    grid.store.getProxy().setExtraParam('id', item);
    grid.store.getProxy().setExtraParam('ids', CV.config.ChadoViewer.getComaIds());

    annot.store.getProxy().setExtraParam('ids', CV.config.ChadoViewer.getComaIds());
    
    panel.setDS(item);

    //set page number to one on changing library
    grid.store.loadPage(1);

  },
  selectNode : function() {
    var store = this.getTree().store, sm;
    store && this.treeLoaded(store);
    if (this.item !== null) {
      var itemRecord,
      //         view = this.getLib(),
      tree = this.getTree(), sm = tree.getSelectionModel();
      itemRecord = tree.getStore().getRootNode().findChild(this.libraryId, this.item, true);
      itemRecord && itemRecord.parentNode.expand(true);
      itemRecord && sm.select(itemRecord, false, true);
      this.item = null;
    }
  },
  selectNodes:function( ){
    var store = this.getTree().store, sm, i, node, records=[], 
      nodes = CV.config.ChadoViewer.self.selectedIds,findFn;
    findFn = function( item ){
      if( (item.get('type') == node.type) && (item.get('id') == node.id) ){
        return true;
      }
    };
    if (nodes && nodes.length ) {
      var itemRecord,
      tree = this.getTree(), sm = tree.getSelectionModel();
      for ( i in nodes ){
        node = nodes[i];
        itemRecord = tree.getStore().getRootNode().findChildBy( findFn, this, true );
        itemRecord && itemRecord.parentNode.expand( true );
        itemRecord && records.push( itemRecord );
      }
      records && sm.select( records, false, true );
    }
  },
  /*
   * specify the action to be taken when tree is loaded
   */
  treeLoaded : function(store) {
    // store.getRootNode().expand();
  },
  cvtermFilter : function(rowmodel, recs) {
    var i, filters = [];
    // for ( i = 0; i < recs.length; i++ ) {
    // filters.push(Ext.create('Ext.util.Filter', {
    // property : 'cvterm_id',
    // value : recs[i].get('id')
    // }));
    // };
    this.getSequencesGrid().store.filter(filters);
  },
  clearSelection : function() {
    var treePanel = this.getTree(), 
      gridSeq = this.getSequencesGrid(), 
      graph = this.getGraphPanel(), 
      gridMeta = this.getMetadataPanel(), 
      lib = this.getLib();
    treePanel && treePanel.clear();
    gridSeq.clear();
    gridMeta.clear();
    graph.clear();
    lib.changeDataSet = true;
    lib.clearFacets(true);
    lib.changeDataSet = false;
  },
  autoSelect:function(combo, selection) {
    var dsview = this.getLib(), slice = selection[0];
    dsview.facetsStore.loadData([{
      'cvterm_id' : slice.get('cvtermid'),
      'name' : slice.get('cvtermname'),
      'cv_id' : slice.get('cvid')
    }], true);

  },
  /**
   * disable views when library or species are not selected
   */
  disable:function(){
    var tab = this.getAnnotationpanel(), accordion = this.getStatuspanel();
    tab && tab.disable();
    accordion && accordion.disable();
  },
  /**
   * enable views when library or species are selected
   */
  enable:function(){
    var tab = this.getAnnotationpanel(), accordion = this.getStatuspanel();
    tab && tab.enable();
    accordion && accordion.enable();
  }
});