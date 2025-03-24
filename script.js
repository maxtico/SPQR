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

// Tooltip
var tooltip = d3.select("#tooltip");

// Funció de zoom
var zoom = d3.zoom()
  .scaleExtent([1, 100])
  .translateExtent([[0, 0], [width, height]])
  .on("zoom", zoomed);

// Aplicar zoom
svg.call(zoom);

// Carregar dades TopoJSON
d3.json("land_50m.json").then(function(data) {
  var countries = topojson.feature(data, data.objects.land).features;

  // Dibuixar els països
  g.selectAll("path")
    .data(countries)
    .enter().append("path")
    .attr("d", path)
    .style("fill", "#ccc")
    .style("stroke", "#333")
    .style("stroke-width", 0.01);

  // Carregar dades inicials de punts
  loadPoints("cities"); // Carreguem "Ciutats" per defecte

  // Escoltar canvis al selector
  d3.select("#filter").on("change", function() {
    var selected = d3.select(this).property("value");
    loadPoints(selected); // Carregar punts segons la selecció
  });
});

// Funció per carregar punts (ciutats o batalles)
function loadPoints(type) {
  // Eliminar punts existents
  g.selectAll("circle").remove();

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
        text = "Ciutats";
        iconSrc = "Icones/Filtre_mapa/coliseo.png"; // Assegura't que aquest camí sigui correcte
    } else if (view === "battles") {
        text = "Batalles";
        iconSrc = "Icones/Filtre_mapa/batalles.png"; // Assegura't que aquest camí sigui correcte
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
