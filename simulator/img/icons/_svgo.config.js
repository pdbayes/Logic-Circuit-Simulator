module.exports = {
    plugins: [
        "removeXMLNS", // don't need this as we do inline svg
        "removeDimensions", // use viewBox instead, makes svg scale in HTML
    ],
};
