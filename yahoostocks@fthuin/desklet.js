const Desklet = imports.ui.desklet; // cinnamon desklet user interface
const St = imports.gi.St; // Shell toolkit library from GNOME
const Gio = imports.gi.Gio; // URL-IO-Operations
const GLib = imports.gi.GLib; // Files operations
const Gtk = imports.gi.Gtk; // Gtk library (policies for scrollview)
const Mainloop = imports.mainloop; // For repeated updating
const Lang = imports.lang; // Binding desklet to mainloop function
const Settings = imports.ui.settings; // Settings loader based on settings-schema.json file

var console = global; // So we can use console.log
var dirPath = 'yahoostocks@fthuin';
var deskletDir = GLib.get_home_dir() + "/.local/share/cinnamon/desklets/" + dirPath;


function main(metadata, id) {
    return new StockQuoteDesklet(metadata, id);
}

function StockQuoteDesklet(metadata, id) {
    Desklet.Desklet.prototype._init.call(this, metadata, id);
    this.init(metadata, id);
}

StockQuoteDesklet.prototype = {
    __proto__: Desklet.Desklet.prototype,
    init: function (metadata, id) {
        this.metadata = metadata;
        this.id = id;
        this.stockReader = new YahooServiceBasedStockQuoteReader();
        this.loadSettings();
        this.onUpdate();
    },
    loadSettings: function () {
        this.settings = new Settings.DeskletSettings(this, this.metadata['uuid'], this.id);
        this.settings.bindProperty(Settings.BindingDirection.IN, "height", "height", this.onDisplayChanged, null);
        this.settings.bindProperty(Settings.BindingDirection.IN, "width", "width", this.onDisplayChanged, null);
        this.settings.bindProperty(Settings.BindingDirection.IN, "delayMinutes", "delayMinutes", this.onSettingsChanged, null);
        this.settings.bindProperty(Settings.BindingDirection.IN, "companySymbols", "companySymbolsText", this.onSettingsChanged, null);
    },
    onDisplayChanged: function () {
        this.resize();
    },
    onSettingsChanged: function () {
        this.unrender();
        this.removeUpdateTimer();
        this.onUpdate();
    },
    onUpdate: function () {
        var companySymbols = this.companySymbolsText.split("\n");
        try {
            var stockQuotes = this.stockReader.getStockQuotes(companySymbols);
            this.render(stockQuotes);
            this.setUpdateTimer();
        }
        catch (err) {
            this.onError(companySymbols, err);
        }
    },
    onError: function (companySymbols, err) {
        console.log("Cannot get stock quotes for company symbols: " + companySymbols.join(","));
        console.log("The following error occured: " + err);
        console.log("Shutting down...");
    },
    render: function (stockQuotes) {
        var table = new StockQuotesTable();
        table.render(stockQuotes);

        var tableContainer = new St.BoxLayout({
            vertical: true
        });
        tableContainer.add_actor(table.el);

        var scrollView = new St.ScrollView();
        scrollView.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
        scrollView.add_actor(tableContainer);

        this.mainBox = new St.BoxLayout({
            vertical: true,
            width: this.width,
            height: this.height,
            style_class: "stocks-reader"
        });
        this.mainBox.add(scrollView, {expand: true});
        this.setContent(this.mainBox);
    },
    unrender: function () {
        this.mainBox.destroy_all_children();
        this.mainBox.destroy();
    },
    resize: function () {
        this.mainBox.set_size(this.width, this.height);
    },
    setUpdateTimer: function () {
        this.updateLoop = Mainloop.timeout_add(this.delayMinutes * 60 * 1000, Lang.bind(this, this.onUpdate));
    },
    removeUpdateTimer: function () {
        Mainloop.source_remove(this.updateLoop);
    }
};

var StockQuotesTable = function () {
    this.el = new St.Table({homogeneous: false});
};
StockQuotesTable.prototype = {
    constructor: StockQuotesTable,
    currencyCodeToSymbolMap: {
        USD: "$",
        EUR: "\u20AC",
        JPY: "\u00A5",
        GBP: "\u00A3",
        INR: "\u20A8"
    },
    render: function (stockQuotes) {
        for (var rowIndex = 0, l = stockQuotes.length; rowIndex < l; rowIndex++)
            this.renderTableRow(stockQuotes[rowIndex], rowIndex);
    },
    renderTableRow: function (stockQuote, rowIndex) {
        var cellContents = [
            this.createPercentChangeIcon(stockQuote),
            this.createCompanyNameLabel(stockQuote),
            this.createStockSymbolLabel(stockQuote),
            this.createStockPriceLabel(stockQuote),
            this.createPercentChangeLabel(stockQuote)
        ];

        for (var columnIndex = 0; columnIndex < cellContents.length; ++columnIndex)
            this.el.add(cellContents[columnIndex], {
                row: rowIndex,
                col: columnIndex,
                style_class: "stocks-table-item"
            });
    },
    createStockSymbolLabel: function (stockQuote) {
        return new St.Label({
            text: stockQuote.symbol,
            style_class: "stocks-label"
        });
    },
    createStockPriceLabel: function (stockQuote) {
        var currencyCode = stockQuote.Currency;
        var currencySymbol = this.currencyCodeToSymbolMap[currencyCode] || currencyCode;
        return new St.Label({
            text: currencySymbol + '' + stockQuote.LastTradePriceOnly,
            style_class: "stocks-label"
        });
    },
    createCompanyNameLabel: function (stockQuote) {
        return new St.Label({
            text: stockQuote.Name,
            style_class: "stocks-label"
        });
    },
    createPercentChangeIcon: function (stockQuote) {
        var path = "";
        var percentChange = parseFloat(stockQuote.PercentChange.slice(0, -1));

        if (percentChange > 0)
            path = "/icons/up.svg";
        else if (percentChange < 0)
            path = "/icons/down.svg";
        else if (percentChange == 0)
            path = "/icons/eq.svg";
        var iconFile = Gio.file_new_for_path(deskletDir + '' + path);

        var uri = iconFile.get_uri();
        var image = St.TextureCache.get_default().load_uri_async(uri, -1, -1);
        image.set_size(20, 20);

        var binIcon = new St.Bin({height: "20px", width: "20px"});
        binIcon.set_child(image);
        return binIcon;
    },
    createPercentChangeLabel: function (stockQuote) {
        return new St.Label({
            text: stockQuote.PercentChange,
            style_class: "stocks-label"
        });
    }
};


var YahooServiceBasedStockQuoteReader = function () {
};

YahooServiceBasedStockQuoteReader.prototype = {
    constructor: YahooServiceBasedStockQuoteReader,
    yqlServiceUrl: "https://query.yahooapis.com/v1/public/yql",
    yqlTemplate: "select * from yahoo.finance.quotes where symbol in (:selectedCompanyCodes)",
    getStockQuotes: function (companySymbols) {
        var request = this.createYQLServiceRequest(companySymbols);
        var response = this.getYQLServiceResponse(request);
        return this.fetchStockQuotes(response);
    },
    createYQLServiceRequest: function (companySymbols) {
        var yql = this.yqlTemplate.replace(":selectedCompanyCodes", '"' + companySymbols.join('","') + '"');
        var requestDetails = {
            q: yql,
            format: "json",
            env: "store://datatables.org/alltableswithkeys",
            callback: ""
        };
        var encodedRequestDetails = [];
        for (var property in requestDetails)
            encodedRequestDetails.push(encodeURI(property) + "=" + encodeURIComponent(requestDetails[property]));
        return this.yqlServiceUrl + "?" + encodedRequestDetails.join("&");
    },
    getYQLServiceResponse: function (request) {
        var urlcatch = Gio.file_new_for_uri(request);
        var loaded = false,
            content;
        loaded = urlcatch.load_contents(null)[0];
        if (!loaded)
            throw new Error("Service not available?");
        content = urlcatch.load_contents(null)[1];
        return JSON.parse(content.toString());
    },
    fetchStockQuotes: function (response) {
        var quotes = [];
        var dataRows = response.query.results.quote;
        var rowCount = response.query.count;
        if (rowCount == 1)
            dataRows = [response.query.results.quote];
        for (var rowIndex = 0; rowIndex < rowCount; rowIndex++)
            quotes[rowIndex] = dataRows[rowIndex];
        return quotes;
    }
};




