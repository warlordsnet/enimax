var config : EnimaxConfig = {
    "local": localStorage.getItem("local") === "true",
    "remote": localStorage.getItem("remote"),
    "remoteWOport": localStorage.getItem("remoteWOport"),
    "chrome": false,
    "manifest": "v3",
    "firefox": false,
    "beta": false,
    "sockets": false
};

localStorage.setItem("version", "1.3.3");
localStorage.setItem("updatedTime", "1692064907098");

if (localStorage.getItem("lastUpdate") === null) {
    localStorage.setItem("lastUpdate", "0");
}