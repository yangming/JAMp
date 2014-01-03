Ext.define('CV.controller.Feature', {
  extend : 'Ext.app.Controller',
  models : ['CV.model.Feature'],
  requires:['CV.config.ChadoViewer','CV.view.feature.View','CV.view.feature.Grid','CV.ux.Router'],
  // stores : ['CV.store.Features'],
  views : ['CV.view.feature.View','CV.view.feature.Grid'],
  // references to views that are controlled by this controller
  refs : [{
    ref : 'feature',
    selector : 'featureview'
  },{
    ref : 'featureGrid',
    selector : 'featureview featuregrid'
  },{
    ref : 'metadataPanel',
    selector : 'featureview cvtermsgrid'
  },{
    ref:'fastaPanel',
    selector :'featureview fastacontainer[id=nucleotide]'
  },{
    ref:'proteinPanel',
    selector :'featureview fastacontainer[id=proteintranslation]'
  },{
    ref:'genomePanel',
    selector :'featureview genomebrowser'
  },{
    ref:'sequencePanel',
    selector :'featureview sequenceview'
  },{
    ref:'annotations',
    selector : 'featureview featureannotations'
  },{
    ref:'networkcanvas',
    selector: 'featureview networkcanvas'
  },{
    ref:'networklist',
    selector: 'featureview networklist'
  },{
    ref:'translation',
    selector:'featureview combobox[name=translation]'
  },{
    ref:'transcriptlist',
    selector: 'featureview transcriptlist'
  },{
    ref:'networkviews',
    selector: 'featureview networkpanel panel[name=networkviews]'
  }],
  // config
  name:'Feature',
  uri : 'feature',
  text:'Gene Details',
  featureId : 'id',
  filterProperty:'name',
  featureIdProp:'feature_id',
  btnTooltip: 'Get all transcripts from the database',
  //   this config decides if tree elements need to be selected
  item : null,
  /**
   * stores dataset id 
   */
  dataset: null,
  /**
   * 
   */
  store: 'CV.store.GenomeTracks',  
  init : function() {
    var treeView, gridView;
    gridView = Ext.create('CV.view.feature.View');
    gridView.show();
    this.control({
      'featureview featuregrid' : {
        //select:this.gridSelect,
        headerfilterchange : this.updateFilter,
        clearfilter: this.clearSelection,
        scope:this
      },
      'viewport > radiogroup > button[name=Feature]' : {
        render : this.headerInit,
        scope : this
      },
      'featureview genomebrowser':{
        trackclick: this.showUniprotGroup,
        nodeclick: this.findTrackId,
        scope: this
      },
      'featureview networklist':{
        select: this.transformSelection,
        scope: this
      },
      'featureview networkcanvas':{
        nodeclick: this.showDetails,
        networkempty: this.rawdataFocus,
        scope: this
      },
      'featureview combobox[name=translation]':{
        select: this.translate
      }
    });
  },
  options:{
    graphType : 'Genome',
    useFlashIE : true,
    backgroundType : 'gradient',
    backgroundGradient1Color : 'rgb(0,183,217)',
    backgroundGradient2Color : 'rgb(4,112,174)',
    oddColor : 'rgb(220,220,220)',
    evenColor : 'rgb(250,250,250)',
    missingDataColor : 'rgb(220,220,220)'//,
    // the below params prevents zoom out
    // setMin : 0,
    // setMax : 30
  },
  /*
   * this config is used to store the button connected to this controller. In this case library. It can later be used to toggle button during render at init.
   */
  header : undefined,
  headerInit : function(btn) {
    this.header = btn;
  },
  show : function(params) {
    var view = this.getFeature(), id = params.id, name = params.name, filter;
    // if ( view.create ){
      // view = view.create();
    // }
    this.render( view );
    // to make a selection
    // if ( typeof id !== 'undefined') {
      switch ( id ){
        case 'filter':
          filter = JSON.parse( decodeURIComponent( name ));
          this.setFilters ( filter.items );
        break;
        default:
          this.treeSelect( id , name);
        break;
      }
    // }
  },
  gridSelect:function( grid , record ){
    // this.treeSelect( record.get('feature_id') , record.get('name'));
    this.updateSelection( record.get('feature_id') , record.get('name') );
  },
  setFilters : function   ( filter ) {
    var grid = this.getFeatureGrid();
    grid.headerFilterPlugin.setFilters( filter );
    grid.store.load();
  },
  updateFilter : function( grid , filters) {
    var jsonFilter = JSON.stringify( filters ), url = this.uri + '/filter/' + jsonFilter;
    CV.ux.Router.redirect(url);
    return false;
  },
  clearSelection:function( id , name ){
    this.getSequencePanel().disable();
    this.updateSelection( id , name);
  },
  updateSelection : function( id, name ) {
    var url = this.uri;
    if( id && name ){
      url += '/' + id;
    }
    CV.ux.Router.redirect(url);
  },
  treeSelect : function(item , name) {
    var grid, panel, filter={}, metadataPanel, fasta, section, annot,nl, protein;
    section = item? 'details': 'start';
    grid = this.getFeatureGrid();
    metadataPanel = this.getMetadataPanel();
    fasta = this.getFastaPanel();
    annot = this.getAnnotations();
    protein = this.getProteinPanel();
    // make sure this is set since it will decide if the node is selected on tree panel.
    // It had to be done this way as some times tree takes long time to load. Hence search returns null.
    this.item = item;
    /**
     * disable network view panel
     */
    this.disableTranscriptNetworkVisualizer();

    this.clear();
    switch( section ){
      case 'details':
          this.getSequencePanel().enable();
          grid.store.clearFilter( true );
          grid.store.filter( this.featureIdProp , item );          

          metadataPanel.store.getProxy().setExtraParam( this.featureIdProp , item );
          metadataPanel.store.load();
          
          annot.store.getProxy().setExtraParam(this.featureIdProp, item);
          annot.store.load();
          
          nl = this.getNetworklist();
          nl.store.getProxy().setExtraParam('dataset_id', this.dataset );
          nl.store.getProxy().setExtraParam('feature_id', item);
          nl.store.load();
          //add track
          this.loadTracks( item );
          
          fasta.load( item );
          protein.load ( item );
      break;
      case 'start':
          grid.store.clearFilter( true );
          grid.store.load();
          metadataPanel.store.removeAll();
          fasta.setFasta('');
      break;
    }
  },
  loadTracks:function( id ){
    var gp = this.getGenomePanel();
    gp.load( id );
  },
  renderTracks:function( tracks  ){
    this.getSequencePanel().addGenomeBrowser(  tracks , this.options );
  },
  showUniprotGroup:function( track ){
    var mp;
    mp = this.getMetadataPanel();
    if( track.grpName && mp.grpFeature && mp.store.count() ){
      mp.grpFeature.collapseAll();
      mp.grpFeature.expand(track.grpName, true);
    }
  },
  transformSelection:function( tree , record ){
    this.loadNetwork( undefined, [ record ] );
  },
  loadNetwork:function(rm, records){
    var rec, id, networkid ;
    if( records.length ){
      networkid = records[0].get('networkid');
      id = this.item;
      if( networkid ){
        this.enableTranscriptNetworkVisualizer();
        this.getNetworklist().getSelectionModel().deselectAll();
        // canvasxpress
        this.getNetworkcanvas().store.getProxy().setExtraParam('network_id', networkid);
        this.getNetworkcanvas().store.getProxy().setExtraParam('dataset_id', id);
        this.getNetworkcanvas().store.load();
        
        // transcript data grid
        this.getTranscriptlist().store.getProxy().setExtraParam('network_id', networkid);
        this.getTranscriptlist().store.getProxy().setExtraParam('dataset_id', id);
        this.getTranscriptlist().store.load();
      }
    }
  },
  showDetails : function( id, dataset ){
    var newItem;
    dataset = dataset || this.dataset;
    dataset = dataset || this.getDataset( this.item );
    newItem = dataset +'.' + id;
    // dataset && this.treeSelect( dataset +'.' + id );
    if( newItem !== this.item ){
      dataset && this.updateSelection( newItem , dataset); 
    }
  },
  getDataset: function( id ){
    var dataset, match;
    id = id || '';
    if ( id ){
      match = id.match(/dataset_([0-9]+)/);
      dataset = match && match[0];
      this.dataset = dataset;
    }
    return dataset;
  },
  translate:function(combo , recs ){
    var pPanel = this.getProteinPanel(), rec = recs[0];
    pPanel.load( null, rec.get('id') );
  },
  /**
   * this function is used to clear all panel of their respective data.
   */
  clear: function(){
    var ncanvas = this.getNetworkcanvas(),
      annotations = this.getAnnotations(),
      nlist = this.getNetworklist(),
      fpanel = this.getFastaPanel(),
      ppanel = this.getProteinPanel(),
      rawdata = this.getTranscriptlist();
    ncanvas.store.removeAll();
    nlist.store.getRootNode().removeAll();
    fpanel.store.removeAll(),
    ppanel.store.removeAll();
    rawdata.store.removeAll();
    /**
     * if childnodes are null extjs 4.2 crashes
     */
    annotations.store.getRootNode().removeAll();
  },
  /**
   * 
   */
  findTrackId:function( track ){
    if ( track[0].type == 'box' ){
      switch( track[0].metaname ){
        case 'transcript':
        case 'gene':
          this.showDetails( track[0].id );
          break;
      }
    }
  },
  rawdataFocus:function(){
    var views = this.getNetworkviews(),
      comp = this.getTranscriptlist();
    comp.rendered && comp.expand();
  },
  disableTranscriptNetworkVisualizer:function(){
    var nv = this.getNetworkviews();
    nv.disable();
  },
  enableTranscriptNetworkVisualizer:function(){
    var nv = this.getNetworkviews();
    nv.enable();
  }
}); 