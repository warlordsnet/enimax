var fmovies: extension = {
    baseURL: fmoviesBaseURL,
    type: "tv",
    disableAutoDownload: false,
    disabled: false,
    name: "FlixHQ",
    shortenedName: "Flix",
    searchApi: async function (query: string): Promise<extensionSearch> {
        let tempDOM = new DOMHandler();

        try {
            query = decodeURIComponent(query);
            let response = await MakeFetchZoro(`https://${fmoviesBaseURL}/search/${query.replace(" ", "-")}`, {});

            tempDOM.innerHTML = DOMPurify.sanitize(response);
            let data: Array<extensionSearchData> = [];

            let section = tempDOM.document.querySelectorAll(".flw-item");
            for (var i = 0; i < section.length; i++) {

                let current = section[i];

                let dataCur: extensionSearchData = {
                    "image": "",
                    "link": "",
                    "name": "",
                };

                let poster = current.querySelector(".film-poster");
                let detail = current.querySelector(".film-detail");
                let temlLink = poster.querySelector("a").getAttribute("href");

                if (temlLink.includes("http")) {
                    temlLink = (new URL(temlLink)).pathname;
                }

                dataCur.image = poster.querySelector("img").getAttribute("data-src");
                dataCur.link = temlLink + "&engine=2";
                dataCur.name = (detail.querySelector(".film-name") as HTMLElement).innerText.trim();

                data.push(dataCur);
            }

            return {
                "status": 200,
                "data": data
            };
        } catch (err) {
            throw err;
        }
    },
    getSeason: async function getSeason(showID: string, showURL: string) {
        let tempSeasonDIV = new DOMHandler();
        let tempMetaDataDIV = new DOMHandler();

        try {
            const isInk = fmoviesBaseURL.includes(".ink");
            let seasonHTML = await MakeFetch(`https://${fmoviesBaseURL}/ajax/v2/tv/seasons/${showID}`);

            tempSeasonDIV.innerHTML = DOMPurify.sanitize(seasonHTML);
            let tempDOM = tempSeasonDIV.document.getElementsByClassName("dropdown-item ss-item");
            let seasonInfo = {};

            for (var i = 0; i < tempDOM.length; i++) {
                seasonInfo[(tempDOM[i] as HTMLElement).innerText] = tempDOM[i].getAttribute("data-id");
            }

            let showMetaData = await MakeFetch(`https://${fmoviesBaseURL}/${showURL}`);
            tempMetaDataDIV.innerHTML = DOMPurify.sanitize(showMetaData);
            let metaData;
            if (isInk) {
                metaData = {
                    "name": (tempMetaDataDIV.document.querySelector(".detail_page-infor").querySelector(".heading-name") as HTMLElement).innerText,
                    "image": (tempMetaDataDIV.document.querySelector(".detail_page-infor").querySelector(".film-poster-img") as HTMLImageElement).src,
                    "des": (tempMetaDataDIV.document.querySelector(".detail_page-infor").querySelector(".description") as HTMLElement).innerText,
                };
            } else {
                metaData = {
                    "name": (tempMetaDataDIV.document.querySelector(".movie_information").querySelector(".heading-name") as HTMLElement).innerText,
                    "image": (tempMetaDataDIV.document.querySelector(".movie_information").querySelector(".film-poster-img") as HTMLImageElement).src,
                    "des": (tempMetaDataDIV.document.querySelector(".m_i-d-content").querySelector(".description") as HTMLElement).innerText,
                };
            }

            try {
                metaData.genres = [];
                const metaCon = tempMetaDataDIV.document.querySelector(".elements");

                for (const genreAnchor of metaCon.querySelectorAll("a")) {
                    const href = genreAnchor.getAttribute("href");
                    if (href && href.includes("/genre/")) {
                        metaData.genres.push(genreAnchor.innerText);
                    }
                }
            } catch (err) {
                console.error(err);
            }

            return { "status": 200, "data": { "seasons": seasonInfo, "meta": metaData } };

        } catch (error) {
            return { "status": 400, "data": error.toString() };
        }
    },
    getEpisode: async function getEpisode(seasonID: string) {
        let temp = new DOMHandler();

        try {
            let r = await MakeFetch(`https://${fmoviesBaseURL}/ajax/v2/season/episodes/${seasonID}`);
            temp.innerHTML = DOMPurify.sanitize(r);
            let tempDOM = temp.document.getElementsByClassName("nav-link btn btn-sm btn-secondary eps-item");
            let data = [];
            for (var i = 0; i < tempDOM.length; i++) {
                let episodeData = {
                    title: tempDOM[i].getAttribute("title"),
                    id: tempDOM[i].getAttribute("data-id"),
                };
                data.push(episodeData);
            }

            return { "status": 200, "data": data };

        } catch (error) {
            return { "status": 400, "data": error.toString() };
        }
    },
    getAnimeInfo: async function (url: string): Promise<extensionInfo> {

        const isInk = url.includes("-full-");

        // For backwards compatibility
        if (!url.includes("-online-") && !fmoviesBaseURL.includes(".ink")) {
            url = url.replace("-full-", "-online-");
        } else if (url.includes("-online-") && fmoviesBaseURL.includes(".ink")) {
            url = url.replace("-online-", "-full-");
        }

        let self = this;
        let urlSplit = url.split("&engine");
        if (urlSplit.length >= 2) {
            url = urlSplit[0];
        }

        let data: extensionInfo = {
            "name": "",
            "image": "",
            "description": "",
            "episodes": [],
            "mainName": ""
        };

        let showIdSplit = url.split("-");
        let showId = showIdSplit[showIdSplit.length - 1].split(".")[0];
        const rawURL = `https://${fmoviesBaseURL}/${url}`;

        try {

            let response = await self.getSeason(showId, url);


            if (response.status == 200) {
                data.name = response.data.meta.name;
                data.image = response.data.meta.image;
                data.description = response.data.meta.des;
                data.mainName = url.split("/watch-")[1].split(isInk ? "-full" : "-online")[0] + "-" + showId + "-";
                data.episodes = [];

                if (response.data.meta.genres && response.data.meta.genres.length > 0) {
                    data.genres = response.data.meta.genres;
                }

                let allAwaits = [];
                let seasonNames = [];
                let metaDataPromises = [];
                let metaData = {};


                for (let season in response.data.seasons) {
                    seasonNames.push(season);

                    try {
                        // metaDataPromises.push(await MakeFetchTimeout(`https://ink-fork-carpenter.glitch.me/tv/season?id=${showId}&season=${season.split(" ")[1].trim()}`, {}, 1000));
                    } catch (err) {

                    }


                    allAwaits.push(self.getEpisode(response.data.seasons[season]));
                }

                let values;
                let tempMetaData: string[] = [];
                let isSettleSupported = "allSettled" in Promise;
                if (!isSettleSupported) {
                    try {
                        tempMetaData = await Promise.all(metaDataPromises);
                    } catch (err) {

                    }
                    values = await Promise.all(allAwaits);

                } else {
                    let allReponses = await Promise.allSettled([Promise.all(allAwaits), Promise.all(metaDataPromises)]);
                    if (allReponses[0].status === "fulfilled") {
                        values = allReponses[0].value;
                    } else {
                        throw Error("Could not get the seasons. Try again.");
                    }

                    if (allReponses[1].status === "fulfilled") {
                        tempMetaData = allReponses[1].value;
                    }
                }

                try {
                    for (let i = 0; i < tempMetaData.length; i++) {
                        let metaJSON = JSON.parse(tempMetaData[i]);

                        let episodeData: any = {};

                        for (let j = 0; j < metaJSON.episodes.length; j++) {
                            let curEpisode = metaJSON.episodes[j];
                            episodeData[curEpisode.episode_number] = {};
                            episodeData[curEpisode.episode_number].thumbnail = `https://image.tmdb.org/t/p/w300${curEpisode.still_path}`,
                                episodeData[curEpisode.episode_number].description = curEpisode.overview
                        }

                        metaData[metaJSON.season_number] = episodeData;

                    }
                } catch (err) {
                    console.error(err);
                }

                data.totalPages = values.length;
                data.pageInfo = [];

                for (let key = 0; key < values.length; key++) {
                    let seasonData = values[key];

                    data.pageInfo.push({
                        "pageName": seasonNames[key],
                        "pageSize": seasonData.data.length
                    });

                    for (let i = 0; i < seasonData.data.length; i++) {
                        let tempData: extensionInfoEpisode = {
                            title: `${seasonNames[key]} | ${seasonData.data[i].title}`,
                            link: `?watch=${url}.${seasonData.data[i].id}&engine=2`,
                        };

                        try {
                            let ep = parseInt(seasonData.data[i].title.split("Eps ")[1]);
                            let season = seasonNames[key].split(" ")[1].trim();

                            tempData.altTitle = `Season ${season} Episode ${ep}`;
                            tempData.altTruncatedTitle = `S${season} E${ep}`;

                            if (season in metaData && ep in metaData[season]) {
                                tempData.thumbnail = metaData[season][ep].thumbnail;
                                tempData.description = metaData[season][ep].description;
                            }
                        } catch (err) {
                            console.error(err);
                        }
                        data.episodes.push(tempData);
                    }
                }

                if (Object.keys(response.data.seasons).length === 0) {


                    let thumbnail = null;
                    try {
                        // thumbnail = `https://image.tmdb.org/t/p/w300${JSON.parse(await MakeFetchTimeout(`https://ink-fork-carpenter.glitch.me/movies?id=${showId}`, {}, 1000)).backdrop_path}`;
                    } catch (err) {

                    }

                    let tempData: extensionInfoEpisode = {
                        title: `Watch`,
                        link: `?watch=${url}&engine=2`
                    };

                    if (thumbnail) {
                        tempData.thumbnail = thumbnail;
                    }
                    data.episodes.push(tempData);
                    data.totalPages = 1;
                    data.pageInfo = [{
                        "pageName": "Movie",
                        "pageSize": 1
                    }];

                }

                return data;

            } else {
                throw Error("Could not get the seasons.");
            }
        } catch (err) {
            err.url = rawURL;
            throw err;
        }

    },
    getLinkFromStream: async function getLinkFromStream(url: string) {
        try {
            var option = {
                'headers': {
                    'x-requested-with': 'XMLHttpRequest',
                }
            };

            let host = (new URL(url)).origin;
            let linkSplit = url.split("/");
            let link = linkSplit[linkSplit.length - 1];
            link = link.split("?")[0];

            let sourceJSON = JSON.parse(await MakeCusReqFmovies(`${host}/ajax/embed-4/getSources?id=${link}&_token=3&_number=${6}`, option));
            return (sourceJSON);

        } catch (err) {
            throw err;
        }
    },
    getLinkFromUrl: async function (url: string): Promise<extensionVidSource> {
        const isInk = fmoviesBaseURL.includes(".ink");

        let self = this;
        if (!url.includes("-online-") && !fmoviesBaseURL.includes(".ink")) {
            url = url.replace("-full-", "-online-");
        } else if (url.includes("-online-") && fmoviesBaseURL.includes(".ink")) {
            url = url.replace("-online-", "-full-");
        }

        url = url.split("&engine")[0];

        const data: extensionVidSource = {
            sources: [],
            name: "",
            title: "",
            nameWSeason: "",
            episode: "",
            status: 400,
            message: "",
            next: null,
            prev: null
        };

        let showIdSplit = url.split("-");
        let showId = showIdSplit[showIdSplit.length - 1].split(".")[0];

        const infoDOM = new DOMHandler();
        const tempGetDom = new DOMHandler();
        const temp = new DOMHandler();

        try {
            const option = {
                'headers': {
                    'referer': 'https://fmovies.ps/',
                    'user-agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.80 Safari/537.36 Edg/98.0.1108.43",
                }
            };

            let split = url.split("-");
            split = split[split.length - 1].split(".");

            let isShow = split.length == 1;
            let server: string;
            let ep: string;


            let responseAPI: string;
            if (isShow) {
                ep = split[0];
                responseAPI = await MakeCusReqFmovies(`https://${fmoviesBaseURL}/ajax/movie/episodes/${ep}`, option);
            } else {
                ep = split[1];
                responseAPI = await MakeCusReqFmovies(`https://${fmoviesBaseURL}/ajax/v2/episode/servers/${ep}`, option)
            }



            if (isShow) {
                let getLink2 = responseAPI;
                infoDOM.innerHTML = DOMPurify.sanitize(getLink2);

                let tempDOM = infoDOM.document.getElementsByClassName("nav-link btn btn-sm btn-secondary");

                for (var i = 0; i < tempDOM.length; i++) {
                    if (tempDOM[i].getAttribute("title").toLowerCase().indexOf("vidcloud") > -1) {
                        server = tempDOM[i].getAttribute("data-linkid");
                        break;
                    }

                }

            } else {
                let getLink2 = responseAPI;
                infoDOM.innerHTML = DOMPurify.sanitize(getLink2);
                let tempDOM = infoDOM.document.getElementsByClassName("nav-link btn btn-sm btn-secondary");

                for (var i = 0; i < tempDOM.length; i++) {
                    if (tempDOM[i].getAttribute("title").toLowerCase().indexOf("vidcloud") > -1) {
                        server = tempDOM[i].getAttribute("data-id");
                        break;
                    }
                }

            }

            let seasonLinkPromises = [
                MakeFetch(`https://${fmoviesBaseURL}/watch-${url.split(".")[0]}.${server}`),
                MakeCusReqFmovies(`https://${fmoviesBaseURL}/ajax/get_link/${server}`, option)
            ];

            let seasonLinkData = await Promise.all(seasonLinkPromises);

            let getSeason = seasonLinkData[0];

            tempGetDom.innerHTML = DOMPurify.sanitize(getSeason);
            let currentSeason = tempGetDom.document.querySelector(".detail_page-watch").getAttribute("data-season");


            let getLink = seasonLinkData[1];

            let title = JSON.parse(getLink).title;
            let link = JSON.parse(getLink).link;

            let promises = [self.getLinkFromStream(link)];
            let seasonNotEmpty = false;
            if (currentSeason != "") {
                seasonNotEmpty = true;
                promises.push(MakeFetch(`https://${fmoviesBaseURL}/ajax/v2/season/episodes/${currentSeason}`));
            }

            let parallelReqs = await Promise.all(promises);

            if (seasonNotEmpty) {
                let r = parallelReqs[1];
                temp.innerHTML = DOMPurify.sanitize(r);
                let tempDOM = temp.document.getElementsByClassName("nav-link btn btn-sm btn-secondary eps-item");
                for (var i = 0; i < tempDOM.length; i++) {
                    if (ep == tempDOM[i].getAttribute("data-id")) {
                        if (i != 0) {
                            data.prev = url.split(".")[0] + "." + tempDOM[i - 1].getAttribute("data-id") + "&engine=2";
                        }

                        if (i != (tempDOM.length - 1)) {
                            data.next = url.split(".")[0] + "." + tempDOM[i + 1].getAttribute("data-id") + "&engine=2";
                        }
                    }

                }
            }

            let sourceJSON = parallelReqs[0];
            let encryptedURL = sourceJSON.sources;
            let decryptKey: any;

            if (typeof encryptedURL == "string") {
                try {
                    decryptKey = await extractKey(4, null, true);
                    try {
                        decryptKey = JSON.parse(decryptKey);
                    } catch (err) {

                    }

                    if (typeof decryptKey === "string") {
                        sourceJSON.sources = JSON.parse(CryptoJS.AES.decrypt(encryptedURL, decryptKey).toString(CryptoJS.enc.Utf8));
                    } else {
                        const encryptedURLTemp = encryptedURL.split("");
                        let key = "";

                        for (const index of decryptKey) {
                            for (let i = index[0]; i < index[1]; i++) {
                                key += encryptedURLTemp[i];
                                encryptedURLTemp[i] = null;
                            }
                        }

                        decryptKey = key;
                        encryptedURL = encryptedURLTemp.filter((x) => x !== null).join("");
                        console.log(encryptedURL, decryptKey);
                        sourceJSON.sources = JSON.parse(CryptoJS.AES.decrypt(encryptedURL, decryptKey).toString(CryptoJS.enc.Utf8));
                    }
                } catch (err) {
                    if (err.message == "Malformed UTF-8 data") {
                        decryptKey = await extractKey(4);
                        try {
                            sourceJSON.sources = JSON.parse(CryptoJS.AES.decrypt(encryptedURL, decryptKey).toString(CryptoJS.enc.Utf8));
                        } catch (err) {

                        }
                    }
                }
            }

            data.status = 200;
            data.message = "done";

            if (title == "") {
                data.episode = (1).toString();
            } else {
                data.episode = parseFloat(title.split(" ")[1]).toString();
            }

            data.name = url.split("/watch-")[1].split(isInk ? "-full" : "-online")[0] + "-" + showId + "-";
            data.nameWSeason = url.split("/watch-")[1].split(isInk ? "-full" : "-online")[0] + "-" + currentSeason;

            data.sources = [{
                "url": sourceJSON.sources[0].file,
                "name": "HLS",
                "type": "hls",
            }];


            try {
                title = title.split(":");
                title.shift();
                title = title.join(":").trim();
            } catch (err) {

            }

            data.title = title;

            data.subtitles = sourceJSON.tracks;

            if (parseFloat(data.episode) === 0) {
                data.episode = "0.1";
            }

            return (data);



        } catch (err) {
            console.error(err);
            throw (new Error("Couldn't get the link"));
        }
    },
    discover: async function (): Promise<Array<extensionDiscoverData>> {
        let temp = new DOMHandler()

        try {
            temp.innerHTML = DOMPurify.sanitize(await MakeFetch(`https://fmovies.ink/tv-show`, {}));
            let data = [];
            for (const elem of temp.document.querySelectorAll(".flw-item")) {
                let image = elem.querySelector("img").getAttribute("data-src");
                let tempAnchor = elem.querySelector(".film-name");
                let name = (tempAnchor as HTMLElement).innerText.trim();
                let link = tempAnchor.querySelector("a").getAttribute("href");

                try {
                    link = (new URL(link)).pathname;
                } catch (err) {

                }

                data.push({
                    image,
                    name,
                    link
                });
            }

            return data;
        } catch (err) {
            throw err;
        }
    },
    fixTitle: function (title: string) {
        try {
            const tempTitle = title.split("-");
            if (tempTitle.length > 2) {
                tempTitle.pop();
                if (title[title.length - 1] == "-") {
                    tempTitle.pop();
                }
                title = tempTitle.join("-");
                return title;
            } else {
                return title;
            }
        } catch (err) {
            return title;
        }
    }
};