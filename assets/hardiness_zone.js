
document.addEventListener("DOMContentLoaded", function () {
    // Fetch 'locator' key from sessionStorage
    const sessionData = localStorage.getItem("locator");

    if (!sessionData) {
        document.querySelector(".loading-skeleton")?.classList.remove("hide");

        document.querySelectorAll('.loading-skeleton .pdp-text').forEach(el => {
            el.classList.remove('hide');
          });
          document.querySelectorAll('.loading-skeleton .location_detector-wrapper').forEach(el => {
            el.classList.add('hide');
          });
        return; // Exit if session data doesn't exist
    }

    let zoneDetail;
    try {
        zoneDetail = JSON.parse(sessionData);
        document.querySelector(".loading-skeleton")?.classList.remove("hide");
       
    } catch (error) {
        console.error("Invalid JSON data in sessionStorage:", error);
        return;
    }

    // Check if zoneDetail is valid
    if (!zoneDetail || typeof zoneDetail !== "object" || !zoneDetail.zone) {
        return;
    }

    // Main condition check
    if (window.productHardinessZones.includes(zoneDetail.zone)) {
        const zoneAvailability = document.querySelector(".custom-product-availability");

        if (zoneAvailability) {
           
            
            document.querySelector(".loading-skeleton")?.classList.add("hide");
            zoneAvailability.classList.remove("hide");
            document.querySelector(".hardiness_zone_product_explore")?.classList.add("hide");

        }
    } else {

        if (["1", "2", "12"].includes(zoneDetail.zone)) {
            document.querySelector(".hardiness_zone_product_explore")?.classList.add("hide");

        } else {
            const hardinessElement = document.querySelector(".hardiness_modal_link");
            if (hardinessElement) {
                hardinessElement.setAttribute("hardiness_id", zoneDetail.zone);
                hardinessElement.textContent = "Zone " + zoneDetail.zone;
            }
            document.querySelector(".hardiness_zone_product_explore")?.classList.remove("hide");

        }



        document.querySelector(".loading-skeleton")?.classList.add("hide");
        document.querySelector(".custom-product-availability")?.classList.add("hide");
    }



});
