/* Author : Florian Thuin */

/***************
 * Libs imports
 ***************/

const Desklet = imports.ui.desklet; // cinnamon desklet user interface
const St = imports.gi.St; // Shell toolkit library from GNOME
const Gio = imports.gi.Gio; // URL-IO-Operations
const GLib = imports.gi.GLib; // Files operations
const Gtk = imports.gi.Gtk; // Gtk library (policies for scrollview)
const Mainloop = imports.mainloop; // For repeated updating
const Lang = imports.lang; // Binding desklet to mainloop function
const Settings = imports.ui.settings; // Load settings-schema.json file

/************
 * Variables
 ************/

var stocksFilePath = '/stocks.list';
var dirPath = 'yahoostocks@fthuin';
var deskletDir = GLib.get_home_dir() + "/.local/share/cinnamon/desklets/" + dirPath;
var comparray = read_file(); /* Companies array */
var mainBox; // BoxLayout integrating whole UI

/************
 * Functions
 ************/

/* Desklet constructor */
function MyDesklet(metadata, desklet_id) {
    this._init(metadata, desklet_id);
}

/* Prototype */
MyDesklet.prototype = {
    __proto__: Desklet.Desklet.prototype,

    /* Initialisation of the desklet */
    _init: function(metadata, desklet_id) {
        Desklet.Desklet.prototype._init.call(this, metadata, desklet_id);

        /* Load settings-schema.json file */
        this.settings = new Settings.DeskletSettings(this, this.metadata['uuid'], desklet_id);
        this.settings.bindProperty(Settings.BindingDirection.IN, "height", "height", this._onDisplayChanged, null);
        this.settings.bindProperty(Settings.BindingDirection.IN, "width", "width", this._onDisplayChanged, null);
        this.settings.bindProperty(Settings.BindingDirection.IN, "delay", "delay", this._onSettingsChanged, null);

        this.update_stocks();
    },

    _onDisplayChanged : function() {
        mainBox.set_size(this.width, this.height);
    },

     _onSettingsChanged : function() {
        mainBox.destroy_all_children();
        mainBox.destroy();
        Mainloop.source_remove(this.mainloop);
        this.update_stocks();
     },

     update_stocks : function() {
        /* Render the values onto the desklet */
        // Main box (stores everything)
        var mainBox = new St.BoxLayout({
                vertical : true,
                width : this.width,
                height : this.height,
                style_class: "stocks-reader"});
        // ScrollView will be put in the main box
        this._view = new St.ScrollView();
        this._view.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);

        // Table in which we store every stocks
        this._stocksTable = new St.Table({homogeneous: false});
        // Box in which we will store the table
        this._stocksBox = new St.BoxLayout({
                vertical : true,
        });

        var quotes = get_stocks();
        for (var i = 0, l = quotes.length ; i < l ; i++) {
            var myStock = quotes[i];
            var cur = "";
            var icon_path = "";

            cur = get_currency_symbol(myStock['Currency']);

            /* Set the change icon, last char is % so must be ignored : */
            if (parseFloat(myStock['PercentChange'].slice(0,-1)) > 0) icon_path = "/icons/up.svg";
            else if (parseFloat(myStock['PercentChange'].slice(0,-1)) < 0) icon_path = "/icons/down.svg";
            else if (parseFloat(myStock['PercentChange'].slice(0, -1)) == 0) icon_path = "/icons/eq.svg";
            // First thing will be the icon of the result
            var binIcon = new St.Bin( {height : "20px", width : "20px" });
            var file = Gio.file_new_for_path(deskletDir + ''+ icon_path);
            var icon_uri = file.get_uri();
            var image = St.TextureCache.get_default().load_uri_async(icon_uri, -1, -1);
                image.set_size(20,20);
                binIcon.set_child(image);

                this._stocksTable.add(binIcon, {
                        row : i,
                        col : 0,
                        style_class : "stocks-table-item"
                });

                // Second column is the name of the company
                var stockName = new St.Label( {
                        text : myStock['Name'],
                        style_class : "stocks-label" });

                this._stocksTable.add(stockName, {
                        row : i,
                        col : 1,
                        style_class : "stocks-table-item"
                });

                // Third thing is the stock symbol
                var stockSymbol = new St.Label({
                        text : myStock['symbol'],
                        style_class : "stocks-label"
                });
                
                this._stocksTable.add(stockSymbol, {
                        row : i,
                        col : 2,
                        style_class : "stocks-table-item"
                });

                var stockPrice = new St.Label( {
                        text : cur + '' + myStock['LastTradePriceOnly'],
                        style_class : "stocks-label"
                });

                this._stocksTable.add(stockPrice, {
                        row : i,
                        col : 3,
                        style_class : "stocks-table-item"
                });

                // Fifth thing is the percent change
                var stockPerChange = new St.Label( {
                        text : myStock['PercentChange'],
                        style_class : "stocks-label"
                });

                this._stocksTable.add(stockPerChange, {
                        row : i,
                        col : 4,
                        style_class : "stocks-table-item"
                });

            }

            this._stocksBox.add_actor(this._stocksTable);
            this._view.add_actor(this._stocksBox);

            mainBox.add(this._view, {expand: true});

            this.setContent(mainBox);

            /* Update every X milliseconds */
            this.mainloop = Mainloop.timeout_add(this.delay * 60 * 1000, Lang.bind(this, this.update_stocks));
     }
}

/* Get all the stocks at once from Yahoo */
function get_stocks() {
        var allcompanies = '';
        var i = 0;
        for (var limit = comparray.length - 1 ; i < limit ; i++) {
            allcompanies += comparray[i] + '%22%2C%22';
        }
        allcompanies += '' + comparray[i];
        
        /* Retrieving data from Yahoo */
        var urlcatch = Gio.file_new_for_uri('https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20yahoo.finance.quotes%20where%20symbol%20in%20(%22'+ allcompanies +'%22)&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=');
        var loaded = false;
        var quotes = [];

        try {
            loaded = urlcatch.load_contents(null)[0];
        } catch (err) {
        return "Invalid Stock?: "+company;
    }

    if (loaded == true) {
        // Load the complete result from http-GET into str
        var str = (urlcatch.load_contents(null)[1]);

        /* Now we create a string array */
        var valuelist = (str).toString();
        var jsonObject = JSON.parse(valuelist);

        var cnt = jsonObject['query']['count']; // Number of retrieved quotes
        if (cnt == 1) {
                quotes[0] = jsonObject['query']['results']['quote'];
        }
        else {
            for (var i = 0 ; i < cnt ; i++) {
                quotes[i] = jsonObject['query']['results']['quote'][i];
            }
        }
    } else {
        global.log(dirPath + " - Cannot find anything for symbol:  " +symbol);
    }
    return quotes;
}

/* Takes in input the abrev name of a currency, output the related
 * symbol */
function get_currency_symbol(curName) {
    var cursymb;
    switch (curName) {
        case "USD" : cursymb = "$";
            break;
        case "EUR" : cursymb = "\u20AC";
            break;
        case "JPY" : cursymb = "\u00A5";
            break;
        case "GBP" : cursymb = "\u00A3";
            break;
        case "INR" : cursymb = "\u20A8";
        default : cursymb = curName;
    }
    return cursymb;

}

/* Read file containing stocks symbol line by line */
function read_file() {
    var file = deskletDir + '' + stocksFilePath ;

    if (GLib.file_test(file, GLib.FileTest.EXISTS)) {
        var content = GLib.file_get_contents(file);
        var stocklist = content.toString().split('\n').slice(0,-1)
        /* Get rid of 'true,' in the first field */
        stocklist[0] = stocklist[0].replace("true,", "");
        return stocklist;
    } else {
        return ['No Companies defined in: ' + this.file];
    }
}

/* Main function, called by default, returns our desklet */
function main(metadata, desklet_id) {
    return new MyDesklet(metadata, desklet_id);
}
