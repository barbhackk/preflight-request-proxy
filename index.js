import chalk from 'chalk';
import commandLineArgs from 'command-line-args';
import commandLineUsage from 'command-line-usage';
import http from 'http';
import httpProxy from 'http-proxy';

const description = 'If you want to use the local development environment with the dev backend,\
this will create a proxy so you won\'t run into CORS issues.\
It accepts the following command line parameters: \r\n\
 - Port : the port where the proxy will listen \r\n\
 - Target : the DEV backend target to contact. \r\n\r\n\
Example: If you set the port to 3000 and target to http://localhost:45680 then\
your actual "resourceBaseUrl" in setting should be http://localhost:3000/api/v1';

const sections = [
    {
        header: chalk.bold.green("Preflight request proxy"),
        content: chalk.white(description),
    },
    {
        header: 'Options',
        optionList: [
            {
                name: 'port',
                alias: 'p',
                typeLabel: '{underline number}',
                description: 'The listened port au reverse proxy. By default port 3000 is used.'
            },
            {
                name: 'target',
                alias: 't',
                typeLabel: '{underline string}',
                description: 'The targeted URL (for exemple your local API, http://127.0.0.1:8001). By default http://127.0.0.1:8000 is used.'
            },
            {
                name: 'help',
                description: 'Print this usage guide.'
            }
        ]
    },
    {
        content: 'Project write by Sébastien DOUTRE: {underline https://github.com/barbhackk}'
    }
]
const usage = commandLineUsage(sections)

// Define the command line options
const optionDefinitions = [
    { name: "help", alias: "h", type: Boolean, defaultValue: false },
    { name: "port", alias: "p", type: Number, defaultValue: 3000 },
    { name: "target", alias: "t", type: String, defaultValue: "http://127.0.0.1:8000" }
];

// parse command line options
const options = commandLineArgs(optionDefinitions);

if (options.help) {
    console.log(usage);
} else {
    // Start the proxy
    console.log("Start proxy on port", options.port, "for", options.target);

    // Create a proxy server with custom application logic
    var proxy = httpProxy.createProxyServer({});
    var sendError = function (res, err) {
        return res.status(500).send({
            error: err,
            message: "An error occured in the proxy"
        });
    };

    // error handling
    proxy.on("error", function (err, req, res) {
        sendError(res, err);
    });

    var enableCors = function (req, res) {
        res.setHeader('access-control-allow-origin', '*');
        res.setHeader('access-control-allow-methods', 'GET, PUT, PATCH, POST, DELETE');
        res.setHeader('access-control-allow-credentials', 'true');

        if (req.headers['access-control-request-headers']) {
            res.setHeader('access-control-allow-headers', req.headers['access-control-request-headers']);
        }
    };

    // set header for CORS
    proxy.on("proxyRes", function (proxyRes, req, res) {
        enableCors(req, res);
    });

    var server = http.createServer(function (req, res) {
        // You can define here your custom logic to handle the request
        // and then proxy the request.
        if (req.method === 'OPTIONS') {
            console.log(chalk.magenta(req.method + " | ") + chalk.bgCyan.white("Pre-flight request interception : ") + chalk.bold(req.url));
            enableCors(req, res);
            res.writeHead(204);
            res.end();
            return;
        }

        console.log(chalk.magenta(req.method + " | ") + chalk.gray("Redirect to --> ") + chalk.bold(options.target + req.url));
        proxy.web(req, res, {
            target: options.target
        }, function (err) {
            sendError(res, err);
        });
    });

    server.listen(options.port);
}