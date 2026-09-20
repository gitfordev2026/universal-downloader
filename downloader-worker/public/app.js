document
.getElementById("downloadBtn")
.addEventListener("click", () => {

  const url =
    document
      .getElementById("url")
      .value
      .trim();

  if (!url) {
    alert("Enter URL");
    return;
  }

  window.location =
    "/download?url=" +
    encodeURIComponent(url);
});