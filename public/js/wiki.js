async function fet(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            return false;
        }
        return await response.json();
    } catch (error) {
        return false;
    }
}
function _ajax(url, method, data) {
    return new Promise((resolve, reject) => {
        kit.send({
            url: url,
            method: method,
            data,
            success: (respuesta) => {
                resolve(respuesta);
            },
            error: (codigo, respuesta) => {
                reject({ codigo, respuesta });
            }
        });
    });
}
function posSearch(type) {
    if (type == false) {
        $(".container-input-search").css("margin-top", 100 + "px");
        return
    }
    if (saved.hasKey("isArt")) {
        if (!saved.getSaved("isArt")) {
            const hBody = $("body").height();
            const hDiv = $(".container-input-search").height();
            const resultPos = (hBody / 2 - (hDiv / 2));
            $(".container-input-search").css("margin-top", resultPos + "px");
        }
    }

}
function handleScroll() {
    const umbral = 300;
    if (this.scrollTop >= umbral) {
        $(".pos-pe").addClass("active");
    } else if (this.scrollTop < umbral) {
        $(".pos-pe").removeClass("active");
    }
}
function formatearFechaEnEspanol(fechaISO8601) {
    const fecha = new Date(fechaISO8601);

    const formatoFecha = new Intl.DateTimeFormat('es', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        timeZoneName: 'short'
    });

    return formatoFecha.format(fecha);
}

async function searchCommand(command) {
    if (command.startsWith("/")) {
        const parts = command.slice(1).split(":");
        const comando = parts[0];
        const valor = parts[1];


        const comandoEncontrado = saved.getSaved("command").find((comandoObj) => {
            return comandoObj.comando === comando && comandoObj.valor === valor;
        });

        if (comandoEncontrado) {
            if (comandoEncontrado.comando == "thumbnail") {
                await _ajax("/save-cog", "POST", { [comandoEncontrado.comando]: comandoEncontrado.valor });
            }
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}

async function loadResult(art) {
    // cog
    let { thumbnail = "on", lang = "es" } = await fet("/cog");
    // add
    if (saved.hasKey("results")) {
        saved.removeSaved("results");
    }
    saved.addSaved("results", [])
    for (const item of art) {
        let image;
        if (thumbnail == "on") {
            try {
                const response = await fetch(`/wiki/${item.pageid}?lang=${lang}`);
                if (!response.ok) {
                    image = "/imagen/wikiapi.svg";
                } else {
                    let data = await response.json();
                    if (data.thumbnail) {
                        image = data.thumbnail.source;
                    } else {
                        image = "/imagen/wikiapi.svg";
                    }
                }

            } catch (error) {
                image = "/imagen/wikiapi.svg";
            }
        } else {
            image = "/imagen/wikiapi.svg";
        }
        let articles = saved.getSaved("templateResults")(item, image, lang);
        saved.addSaved("results", articles)
    }
}

function setHtml(html) {
    const container = kit.qsSelector(false, ".results-all");
    container.innerHTML = "";
    for (const item of html) {
        container.innerHTML += item;
    }
}

function backisLast(numeroTotalDePaginas) {
    for (let i = 1; i <= numeroTotalDePaginas; i++) {
        if (i == numeroTotalDePaginas) {
            const total = (i * 10 - 10);
            return (total - 10);
        }
    }
}

function paginationWiki(totalhits) {
    const pagesAll = Math.ceil(totalhits / 10);
    const pageactive = saved.getSaved("wikinext");
    $(".page-active").text(pageactive.page);
    $(".page-total").text(pagesAll);
}

$(".page-click").on("click", async (event) => {
    if (saved.hasKey("wikinext")) {
        // show loading
        $(".btn-search").find(".icono-search").addClass("hide");
        $(".btn-search").find(".preloader-search").removeClass("hide");

        // set pagination
        const pageactive = saved.getSaved("wikinext");
        const typedata = $(event.currentTarget).attr("data-type");

        if (typedata == "next") {
            const currentPage = pageactive.currentPage;
            const page = pageactive.page;

            await fetchWikipediaResults({ searchTerm: pageactive.value, currentPage: (currentPage + 10), page: (page + 1) });

        } else {

            const currentPage = pageactive.currentPage;
            const page = pageactive.page;

            const residual = currentPage % 10;
            let setCurretnPage = (currentPage - 10);
            if (residual !== 0) {
                setCurretnPage = (currentPage - (residual + 10));
            }

            await fetchWikipediaResults({ searchTerm: pageactive.value, currentPage: setCurretnPage, page: (page - 1) });
        }

        const newdata = saved.getSaved("wikinext");

        const newtotal = Math.ceil(newdata.totalhits / 10);
        if (newdata.page == newtotal) {
            if ($(".right-page").css("display") == "block") {
                $(".right-page").fadeOut("fast");
            }
        } else {
            if ($(".right-page").css("display") == "none") {
                $(".right-page").fadeIn("fast");
            }
        }

        if (newdata.page > 1) {
            if ($(".left-page").css("display") == "none") {
                $(".left-page").fadeIn("fast");
            }
        } else {
            if ($(".left-page").css("display") == "block") {
                $(".left-page").fadeOut("fast");
            }
        }

        if ($(".form-search").scrollTop() >= 200) {
            $(".form-search").animate({
                scrollTop: 0
            }, 500);
        }


    }
})

// Realiza una solicitud GET a la API de Wikipedia a través de tu servidor
async function fetchWikipediaResults({ searchTerm, currentPage = 0, page = 1 }) {
    let { lang = "es" } = await fet("/cog");
    // Actualiza la URL para incluir el término de búsqueda y sroffset
    const apiUrl = `/wikipedia?searchTerm=${searchTerm}&sroffset=${currentPage}&lang=${lang}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Error en la solicitud a la API de Wikipedia: ${response.status}`);
        }


        const data = await response.json();
        const searchResults = data.query.search;

        await loadResult(searchResults);

        // show loading
        $(".btn-search").find(".icono-search").removeClass("hide");
        $(".btn-search").find(".preloader-search").addClass("hide");

        setHtml(saved.getSaved("results"));

        const totalhits = data.query.searchinfo.totalhits;

        if (data.continue) {
            if (!saved.hasKey("wikinext")) {
                saved.addSaved("wikinext", {
                    value: searchTerm,
                    sroffset: data.continue.sroffset,
                    totalhits: data.query.searchinfo.totalhits,
                    page,
                    currentPage
                });
            } else {
                saved.updateValue("wikinext", {
                    sroffset: data.continue.sroffset,
                    page: page,
                    currentPage
                })

            }
            paginationWiki(totalhits);
        } else {
            saved.updateValue("wikinext", {
                currentPage: data.query.searchinfo.totalhits,
                page: Math.ceil(totalhits / 10)
            })
            paginationWiki(totalhits);

        }
    } catch (error) {
        console.error("Hubo un error al recuperar datos de Wikipedia:", error);
    }

}
async function setSearch(event) {
    if (event.key) {
        event.preventDefault();
        if (event.key !== "Enter") {
            return
        }
    }

    // verificar si hay texto en el campo
    let searchTerm = $("#text-search").val();
    searchTerm = searchTerm.trim();
    if (searchTerm.length < 1 && !/\S/.test(searchTerm)) {
        return;
    }

    // Verificar Comando
    const comm = await searchCommand(searchTerm);
    if (comm) {
        $("#text-search").val("");
        return
    }
    // end


    saved.addSaved("isArt", true);

    // show loading
    $(".btn-search").find(".icono-search").addClass("hide");
    $(".btn-search").find(".preloader-search").removeClass("hide");

    // remove key
    if (saved.hasKey("wikinext")) {
        saved.removeSaved("wikinext");
    }

    // seacrh new
    posSearch(false);
    $(".btn-search").addClass("disabled");
    await fetchWikipediaResults({ searchTerm, currentPage: 0, page: 1 });
    $(".btn-search").removeClass("disabled");

    // show results
    kit.show(".show-all-results", 300)
}
saved.addSaved("isArt", false);

function changeclass(elm, claseSelect) {
    // Change Class
    const $langselect = $(elm);
    var clases = $langselect.attr("class").split(" ");

    $.each(clases, function (index, clase) {
        if (clase.startsWith("lang-")) {
            $langselect.removeClass(clase);
        }
    });

    $langselect.addClass(`lang-${claseSelect}`)
    $langselect.find(".icono-search").css("color", "#fff");
}
kit.onDOMReady(async () => {
    let { lang = "es" } = await fet("/cog");

    if (lang) {
        changeclass(".btn-search", lang);
    }

    // change lang
    $(".lang-select").on("click", async (evn) => {
        const langSelect = evn.currentTarget.getAttribute("data-lang");
        await _ajax("/save-cog", "POST", { lang: langSelect });

        changeclass(".btn-search", langSelect);
    });

    // scroll
    posSearch()
});

$(window).on('resize', function () {
    posSearch()
});


$(".form-search").on("scroll", handleScroll);


saved.addSaved("templateResults", (item, image, lang) => {
    return `<div class="result-art">
                <div class="icono-name-page">
                    <div class="icono-art" style="background-image: url('${image}');"></div>
                    <div class="info-name-page">
                        <div class="name-art">${item.title}</div>
                        <a href="#openurl=https://${lang}.wikipedia.org/wiki/${item.title.replace(/ /g, '_')}" class="url-art">https://${lang}.wikipedia.org/wiki/${item.title.replace(/ /g, '_')}</a>
                    </div>
                </div>
                <div class="all-data">
                    <div class="title-art-id">ID: <span class="id-art">${item.pageid}</span></div>
                    <div class="title-art">${item.title}:</div>
                    <div class="dcp-art">
                        ${item.snippet}
                    </div>
                </div>
            </div>`
});


// agregar comandos
saved.addSaved("command", [
    { comando: "thumbnail", valor: "off" },
    { comando: "thumbnail", valor: "on" },
]);


