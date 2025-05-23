// Dimensions del mapa
var width = 960, height = 600;

// Projecció
var projection = d3.geoMercator().scale(900).center([10, 48]).translate([width / 2, height / 2]);

// Ruta per crear formes geogràfiques
var path = d3.geoPath().projection(projection);

// Crear el canvas SVG
var svg = d3.select("#map")
  .attr("width", width)
  .attr("height", height);

// Grup per gestionar transformacions amb zoom
var g = svg.append("g");

var countriesLayer = g.append("g").attr("id", "countries");
var provincesLayer = g.append("g").attr("id", "provinces");

// Tooltip
var tooltip = d3.select("#tooltip");

// Funció de zoom
var zoom = d3.zoom()
  .scaleExtent([1, 100])
  .translateExtent([[0, 0], [width, height]])
  .on("zoom", zoomed);

// Aplicar zoom
svg.call(zoom);

// Substitueix tota la carrega inicial per:

Promise.all([
  d3.csv("Taules/provinces.csv"),
  d3.json("land_50m.json")
])
.then(function([meta, topoData]) {
  // 1. Processa el CSV
  provinceIndex = {};
  meta.forEach(d => {
    provinceIndex[d.Province] = { file: d.File, year: +d.Year };
  });

  // 2. Dibuixa el mapa base
  const countries = topojson.feature(topoData, topoData.objects.land).features;
  countriesLayer.selectAll("path")
    .data(countries)
    .enter().append("path")
      .attr("d", path)
      .style("fill", "#ccc")
      .style("stroke", "#333")
      .style("stroke-width", 0.01);

  // 3. Inicia la càrrega de punts i províncies
  loadPoints("cities");
  
  // 4. Connecta el selector
  d3.select("#filter").on("change", function() {
    loadPoints(this.value);
  });
})
.catch(function(err) {
  console.error("Error carregant dades d’inicialització:", err);
  // Tot i l’error, intentem carregar el mapa base
  d3.json("land_50m.json").then(function(topoData) {
    const countries = topojson.feature(topoData, topoData.objects.land).features;
    countriesLayer.selectAll("path")
      .data(countries)
      .enter().append("path")
        .attr("d", path)
        .style("fill", "#ccc")
        .style("stroke", "#333")
        .style("stroke-width", 0.01);
    loadPoints("cities");
    d3.select("#filter").on("change", function() {
      loadPoints(this.value);
    });
  });
});


// Funció per carregar punts (ciutats o batalles)
function loadPoints(type) {
  // Eliminar punts existents
  g.selectAll("circle").remove();
  provincesLayer.selectAll("*").remove();

  if (type === "provinces") {
    loadProvinces();
    return;
  }

  // Carregar el dataset corresponent
  var file = type === "cities" ? "Taules/cities.csv" : "Taules/battles.csv";
  var cssClass = type === "cities" ? "city" : "battle";

  d3.csv(file).then(function(data) {
    g.selectAll("." + cssClass)
      .data(data)
      .enter()
      .append("circle")
      .attr("class", cssClass)
      .attr("cx", d => projection([+d.Longitude, +d.Latitude])[0])
      .attr("cy", d => projection([+d.Longitude, +d.Latitude])[1])
      .attr("r", 2.5)
      .on("mouseover", function(event, d) {
        showTooltip(event, d, type);
      })
      .on("mousemove", function(event) {
          tooltip.style("top", (event.pageY + 10) + "px")
              .style("left", (event.pageX + 10) + "px");
      })
      .on("mouseout", hideTooltip);
    });
}

function loadProvinces() {
  const info = provinceIndex["Spain"];
  if (!info || !info.file) return;

  provincesLayer.selectAll("*").remove();

  d3.json(info.file).then(function(jsonData) {
    const feature = jsonData.features[0];

    // 1) Revertim el LinearRing per CCW
    //    feature.geometry.coordinates[0] és l’array de parells [lon,lat]
    feature.geometry.coordinates[0].reverse();

    // 2) Pintem amb evenodd (o sense, ja que ara és CCW)
    provincesLayer.append("path")
      .datum(feature)
      .attr("class", "spain-highlight")
      .attr("d", path)
      .attr("fill", "#a00")
      .attr("fill-opacity", 0.4)
      .attr("stroke", "#000")
      .attr("stroke-width", 0.5)
      .attr("fill-rule", "evenodd");
  })
  .catch(err => console.error("No s'ha pogut carregar", info.file, err));
}


// Funció per alternar el menú desplegable
function toggleDropdown() {
    var dropdown = document.getElementById("dropdownMenu");
    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
  }
  
  // Funció per canviar el text del botó i amagar el menú
  function changeView(view) {
    var button = document.getElementById("dropbtn");
    var dropdown = document.getElementById("dropdownMenu");

    // Definir el text i la icona segons la selecció
    var text, iconSrc;
    if (view === "cities") {
        text = "Cities";
        iconSrc = "Icones/Filtre_mapa/coliseo.png"; // Assegura't que aquest camí sigui correcte
    } else if (view === "battles") {
        text = "Battles";
        iconSrc = "Icones/Filtre_mapa/batalles.png"; // Assegura't que aquest camí sigui correcte
    } else if (view === "conquerors") {  // Afegim el cas de "conquerors"
        text = "Conquerors";
        iconSrc = "Icones/Filtre_mapa/conqueridors.png";
    } else if (view === "provinces") {  // Afegim el cas de "conquerors"
        text = "Provinces";
        iconSrc = "Icones/Filtre_mapa/provincies.png";
    }


    // Canviar el contingut del botó
    button.innerHTML = `<img src="${iconSrc}" class="filter-icon" alt="${text}"> ${text}`;

    // Amagar el menú després de seleccionar una opció
    dropdown.style.display = "none";

    // Carregar els punts corresponents
    loadPoints(view);
}

  
  // Amaga el menú si es fa clic fora
  document.addEventListener("click", function(event) {
    var dropdown = document.getElementById("dropdownMenu");
    var button = document.getElementById("dropbtn");
    if (!button.contains(event.target) && !dropdown.contains(event.target)) {
      dropdown.style.display = "none";
    }
  });

// Funció de zoom
function zoomed(event) {
  g.attr("transform", event.transform);
  var currentScale = event.transform.k;
  g.selectAll("circle").attr("r", 2.5 / currentScale); // Escalar els punts
}

function showTooltip(event, d, type) {
  if (type === "battles") {
      tooltip.style("visibility", "visible")
          .html(`
            <div style="min-width: 200px; max-width: 400px; white-space: normal; word-wrap: break-word;">
              <strong style="font-size: 1.5em;">${d.Battle}</strong><br>
                <div style="display: flex; align-items: flex-end; justify-content: center; gap: 20px; margin: 10px 0;">
                  <div style="display: flex; flex-direction: column; align-items: center; width: 80px; text-align: center;">
                    <img src="${d.Participant_image}" alt="${d.Participant}" style="width: 35px; height: 50px; object-fit: contain;"> 
                    <span style="font-size: 14px; margin-top: 5px;">${d.Participant}</span>
                  </div>
                  <span style="font-weight: bold;">vs</span>
                  <div style="display: flex; flex-direction: column; align-items: center; width: 80px; text-align: center;">
                    <img src="${d.Roma_image}" alt="Roma" style="width: 50px; height: 50px; object-fit: contain;">
                    <span style="font-size: 14px; margin-top: 5px;">Roma</span>
                  </div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); text-align: center; font-size: 14px; font-weight: bold; margin-top: 10px;">
                      <div>DATE</div>
                      <div>WAR</div>
                      <div>WINNER</div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); text-align: center; font-size: 16px; margin-top: 5px;">
                      <div>${d.Year} aC</div>
                      <div>${d.War}</div>
                      <div>${d.Winner}</div>
                </div>
                <div style="display: flex; align-items: center; justify-content: center; gap: 20px; margin: 10px 0;">
                  <div style="display: flex; flex-direction: column; align-items: center; width: 80px;">
                    <img src="${d.Other_general_image}" alt="${d.Other_general}" style="width: 50px; height: 50px; object-fit: contain;"> 
                    <span style="font-size: 14px; margin-top: 5px; height: 20px; display: flex; align-items: center; justify-content: center; overflow: hidden;">${d.Other_general}</span>
                  </div>
                  <span style="font-weight: bold; height: 20px; display: flex; align-items: center;">vs</span>
                  <div style="display: flex; flex-direction: column; align-items: center; width: 80px;">
                    <img src="${d.Rome_general_image}" alt="${d.Rome_general}" style="width: 50px; height: 50px; object-fit: contain;">
                    <span style="font-size: 14px; margin-top: 5px; height: 20px; display: flex; align-items: center; justify-content: center; overflow: hidden;">${d.Rome_general}</span>
                  </div>
                </div>
          </div>
          `)
          .style("top", (event.pageY + 10) + "px")
          .style("left", (event.pageX + 10) + "px");
  } else {
      tooltip.style("visibility", "visible")
          .text(d.City)
          .style("top", (event.pageY + 10) + "px")
          .style("left", (event.pageX + 10) + "px");
  }
}

function hideTooltip() {
  tooltip.style("visibility", "hidden");
}

// Timeline slider
const yearRange = document.getElementById("yearRange");
const yearInput = document.getElementById("yearInput"); // Nou input de text per l'any

// Actualitzar el valor de l'any quan es mou la barra de desplaçament
yearRange.addEventListener("input", function () {
  const year = +yearRange.value;
  yearInput.value = year;  // Actualitzar també el camp de text

  // Cridem la funció per filtrar les dades per any
  filterByYear(year);
});

// Actualitzar la barra de desplaçament quan l'usuari escriu un valor a l'input de text
yearInput.addEventListener("change", function () {
  const year = yearInput.value;
  // Comprovem que l'any és vàlid dins de l'interval
  if (!isNaN(year) && year >= -753 && year <= 476) {
    yearRange.value = year;  // Actualitzar la barra de desplaçament
    filterByYear(year);  // Cridar la funció per filtrar les dades
  } else {
    yearInput.value = yearRange.value;  // Si l'any no és vàlid, restaurar el valor de la barra
  }
});

function filterByYear(year) {
  g.selectAll("circle").each(function(d) {
    d3.select(this).style("display", +d.Year <= +year ? "block" : "none");
  });
  // Mostrar/ocultar províncies (paths amb atribut any)
  provincesLayer.selectAll("path").each(function(d) {
    const provinceYear = d?.properties?.Year ?? d?.Year ?? currentYear; // Assumeix que si no té any, hauria de ser visible
    d3.select(this).style("display", +provinceYear <= +year ? "block" : "none");
  });
} 
