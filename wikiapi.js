const { app } = require('electron')

const path = require("path");
const fs = require("fs");

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// utilcode
const utilcode = require("../../modules/utilcodes/main")

async function veryFiles(raiz, ruta) {
    await utilcode.createFolderRecursive(raiz, ruta);

    // verificar si existe el archivo de configuracion
    const fileCog = path.join(raiz, ruta, "cog.json");
    if (!fs.existsSync(fileCog)) {
        await utilcode.fsWrite(fileCog, JSON.stringify({}, null, 2));
    }
}

// package
let pakContainer = require("../../package.json")
let pak = require("./package.json")

// Appdata
const appDataPath = app.getPath('appData')

veryFiles(path.normalize(appDataPath), `${pakContainer.name}/apps/` + pak.name + "/json");


// Libreria
const lib = require("../../modules/util-libraries")

const routes = [
    {
        method: "get",
        path: "/",
        handler: (req, res) => {
            res.render(path.join(__dirname, "views", "wiki"), { pak });
        },
    },
    {
        method: "get",
        path: "/cog",
        handler: async (req, res) => {
            const fileCog = path.join(path.normalize(appDataPath), `${pakContainer.name}/apps/` + pak.name + "/json", "cog.json");
            const readCog = await utilcode.fsRead(fileCog);
            let parse = utilcode.jsonParse(readCog);
            res.json(parse);
        },
    },
    {
        method: "post",
        path: "/save-cog",
        handler: async (req, res) => {
            let value = req.body;
            try {
                const fileCog = path.join(path.normalize(appDataPath), `${pakContainer.name}/apps/` + pak.name + "/json", "cog.json");
                const readCog = await utilcode.fsRead(fileCog);
                let parse = utilcode.jsonParse(readCog);
                parse = {
                    ...parse,
                    ...value
                }

                await utilcode.fsWrite(fileCog, JSON.stringify(parse, null, 2));
                res.send(true);
            } catch (error) {
                res.send(false);
            }
        },
    },
    {
        method: "get",
        path: "/wikipedia",
        handler: async (req, res) => {
            const searchTerm = req.query.searchTerm;
            const sroffset = req.query.sroffset || 0;
            const lang = req.query.lang || "es";

            const apiUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&list=search&utf8=1&srsearch=${searchTerm}&sroffset=${sroffset}`;

            try {
                const response = await fetch(apiUrl);
                const data = await response.json();
                res.json(data);
            } catch (error) {
                res.status(500).json({ error: 'Hubo un error al recuperar datos de Wikipedia.' });
            }
        },
    },
    {
        method: "get",
        path: "/wiki/:idpage",
        handler: async (req, res) => {
            const idpage = req.params.idpage;
            const lang = req.query.lang || "es";
            // URL de la API de Wikipedia
            const apiUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages|extracts&explaintext=true&pageids=${idpage}`;

            try {
                const response = await fetch(apiUrl);
                if (response.ok) {
                    const data = await response.json();
                    const pageData = data.query.pages[idpage];

                    if (pageData) {
                        // Extraer la información que deseas de la página (por ejemplo, title, extract, etc.)
                        const pageInfo = {
                            title: pageData.title,
                            extract: pageData.extract,
                            thumbnail: pageData.thumbnail || false,
                            // Puedes agregar más campos según tus necesidades
                        };

                        res.json(pageInfo);
                    } else {
                        res.status(404).json({ error: 'Página no encontrada' });
                    }
                } else {
                    res.status(response.status).json({ error: 'Error en la solicitud a la API de Wikipedia' });
                }
            } catch (error) {
                res.status(500).json({ error: 'Error interno del servidor' });
            }
        },
    }
];
module.exports = [...routes, ...lib];