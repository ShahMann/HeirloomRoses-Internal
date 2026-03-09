class LocatorForm extends HTMLElement {
    constructor() {
        super();
        this.domain = "https://ship.heirloomroses.com";
        this.storageKey = "locator";

        // Use querySelectorAll for selecting elements within the custom element
        this.zoneSelector = document.querySelectorAll(".location_and_grow_zone");
        this.zipcodeInput = this.querySelectorAll(".hardiness-zip-code");
        this.currentLocation = this.querySelectorAll(".zipcode-btns-wrapper .btn-cl");
        this.errorMessage = this.querySelectorAll(".zipcode-input-wrapper .error-message");
        this.hardinessZonemsg = this.querySelectorAll(".success-message-hardiness-zone");
        this.hardinessCollection = this.querySelectorAll(".zone-collection-link");
        this.zipCodeMsg = this.querySelectorAll(".success-message-zip-code");

        this.form = this.querySelector("form");

        if (this.form) {
            this.form.addEventListener("submit", this.handleFormSubmit.bind(this));
        }

        if (this.currentLocation.length) {
            this.currentLocation.forEach(btn => btn.addEventListener("click", this.fetchCurrentLocation.bind(this)));
        } else {
            console.error("Current location button not found.");
        }


    }

    connectedCallback() {
        this.session = this.getLocationSession();
        this.setSessionValue();
    }

    getLocationSession() {
        let session = localStorage.getItem(this.storageKey);
        if (session) {
            return JSON.parse(session);
        }
        return session;
    }

    setSessionValue() {
        if (!this.session) {

            document.querySelectorAll('.hardiness_locator.mobile_locator, .setup_zone , .location-icon-wrapper').forEach(el => {
                el.classList.remove('hide');
            });
            document.querySelector(".toolbar-section")?.classList.remove("toolbar-top-61");
            document.querySelector(".toolbar-section")?.classList.add("toolbar-top-106");

        } else {
            this.zoneSelector.forEach(zone => {
                zone.querySelector(".location-content").classList.remove("hide");
                zone.querySelector(".location-icon-wrapper").classList.remove("hide");
                zone.querySelector(".setup_zone").classList.add("hide");

                zone.querySelector(".location-zone span.location").innerText = this.session.zone;
            });
            document.querySelectorAll('.hardiness_locator.mobile_locator').forEach(el => {
                el.remove();
            });
            document.querySelector(".toolbar-section")?.classList.remove("toolbar-top-106");
            document.querySelector(".toolbar-section")?.classList.add("toolbar-top-61");

            this.hardinessZonemsg.forEach(msg => {
                msg.innerText = "Hardiness zone: " + this.session.zone;
                msg.classList.remove("hide")
            });
            if (![1, 2, 12].includes(parseInt(this.session.zone, 10))) {
                this.hardinessCollection.forEach(msg => {
                    msg.href = `/collections/hardiness-zone-${this.session.zone}`;
                    msg.classList.remove("hide");
                });
            } else {
                this.hardinessCollection.forEach(msg => {
                    msg.classList.add("hide");
                });
            }
            this.zipCodeMsg.forEach(msg => {
                msg.innerText = this.session.zip;
                msg.classList.remove("hide")
            });
            this.errorMessage.forEach(msg => msg.classList.add('hide'));
        }

    }

    async fetchCurrentLocation(evt) {
        console.log("location fetching");

        for (const locationBtn of this.currentLocation) {
            locationBtn.classList.add("btn--loading");
        }

        if (!navigator.geolocation) {
            console.error('Geolocation is not supported by this browser.');
            return;
        }

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                });
            });
            const { latitude, longitude } = position.coords;

            const geocodeResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const geocodeData = await geocodeResponse.json();

            const zipCode = geocodeData.address.postcode;

            if (!zipCode) {
                throw new Error('Could not retrieve ZIP code');
            }

            this.zipcodeInput.forEach(input => input.value = zipCode);

            this.form.dispatchEvent(new Event('submit'));

        } catch (error) {
            console.error('Error fetching location:', error);

            // Remove loading class on error
            for (const locationBtn of this.currentLocation) {
                locationBtn.classList.remove("btn--loading");
            }
            const checkmarkIcon = this.querySelector(".checkmark-icon");
            checkmarkIcon.classList.add("hide");

            if (error.code === 1) {
                alert('Please allow location access to use this feature.');
            } else if (error.code === 2) {
                alert('Unable to retrieve your location. Please try again or enter ZIP code manually.');
            } else if (error.code === 3) {
                alert('Location request timed out. Please try again.');
            } else {
                alert('An error occurred while trying to get your location. Please enter your ZIP code manually.');
            }
        }
    }

    async handleFormSubmit(evt) {
        evt.preventDefault();

        // Get all location buttons specifically from zipcode-btns-wrapper
        const locationButtons = document.querySelectorAll(".zipcode-btns-wrapper .submit-btn");

        // Check if any locationButton has btn--loading class
        const hasLoadingClass = Array.from(locationButtons).some(btn =>
            btn.classList.contains("btn--loading")
        );

        // If no loading class exists, add it to all buttons
        if (!hasLoadingClass) {
            locationButtons.forEach(btn => {
                btn.classList.add("btn--loading");
            });
        }

        let zipCode = this.form.querySelector("input[name='zip']").value;
        if (zipCode.trim().length == 0) return;

        const fetchReq = await fetch(`${this.domain}/api/zone?zip_code=${zipCode}`);
        const fetchRes = await fetchReq.json();


        const removeLoader = document.querySelectorAll(".zipcode-btns-wrapper .btn");

        if (removeLoader) {
            // Remove loading class from all location buttons after API call completes
            removeLoader.forEach(btn => {
                btn.classList.remove("btn--loading");
            });
        }
        if (!fetchRes.data.zoneData[0]) {
            this.errorMessage.forEach(msg => msg.classList.remove('hide'));
            this.hardinessZonemsg.forEach(msg => msg.classList.add('hide'));
            this.zipCodeMsg.forEach(msg => msg.classList.add('hide'));
            const checkmarkIcon = this.querySelector(".checkmark-icon");
            checkmarkIcon.classList.add("hide");
            return;
        }

        const zoneDetail = {
            zone: fetchRes.data.zoneData[0].hardiness_zone.hardiness_zone_name.split(' ')[1],
            zip: zipCode,
            dates: this.getDates(fetchRes.data.zoneData[0].hardiness_zone)
        };

        localStorage.setItem(this.storageKey, JSON.stringify(zoneDetail));
        this.session = zoneDetail;
        this.setSessionValue();
        this.setFilterStickyPosition();
        if (window.CustomerData?.id) {
            const zipList = Array.isArray(window.CustomerData.hardiness_zipcode)
                ? window.CustomerData.hardiness_zipcode.map(z => Number(z.trim()))
                : [];

            const currentZip = Number(zoneDetail.zip);
            const currentZone = Number(zoneDetail.zone);

            if (!zipList.includes(currentZip)) {
                await fetch(`${this.domain}/api/customer/metafields`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        customerId: String(CustomerData.id),
                        zipcode: String(currentZip),
                        zone: String(currentZone),
                    }),
                });
            }
        }

        this.errorMessage.forEach(msg => msg.classList.add('hide'));
        const checkmarkIcon = this.querySelector(".checkmark-icon");
        checkmarkIcon.classList.remove("hide");
        if (window.productHardinessZones?.includes(zoneDetail.zone)) {
            const zoneAvailability = document.querySelector(".custom-product-availability");

            if (zoneAvailability) {

                // if (zoneDetail?.dates?.start == "Anytime") {
                //     const arriveTime = document.querySelectorAll(".arrives-time");
                //     arriveTime.forEach(el => el.classList.add('hide'));


                // } else {
                //     const startArriveTime = document.querySelector(".arrives_zone .start_time");
                //     const endArriveTime = document.querySelector(".arrives_zone .end_time");

                //     if (startArriveTime) {
                //         startArriveTime.textContent = zoneDetail.dates.start;
                //     }
                //     if (endArriveTime) {
                //         endArriveTime.textContent = "and " + zoneDetail.dates.end;
                //     }
                //     const arriveTime = document.querySelectorAll(".arrives-time");
                //     arriveTime.forEach(el => el.classList.remove('hide'));


                // }

                document.querySelector(".loading-skeleton")?.classList.add("hide");
                zoneAvailability.classList.remove("hide");
                document.querySelector(".hardiness_zone_product_explore")?.classList.add("hide");
                //document.querySelector(".no_hardiness_zone_product")?.classList.add("hide");
            }
        } else {
            if (["1", "2", "12"].includes(zoneDetail.zone)) {
                // document.querySelector(".no_hardiness_zone_product")?.classList.remove("hide");
                document.querySelector(".hardiness_zone_product_explore")?.classList.add("hide");
            } else {
                const hardinessElement = document.querySelector(".hardiness_modal_link");
                if (hardinessElement) {
                    hardinessElement.setAttribute("hardiness_id", zoneDetail.zone);
                    hardinessElement.textContent = "Zone " + zoneDetail.zone;
                }
                document.querySelector(".hardiness_zone_product_explore")?.classList.remove("hide");
                //  document.querySelector(".no_hardiness_zone_product")?.classList.add("hide");
            }

            document.querySelector(".loading-skeleton")?.classList.add("hide");
            document.querySelector(".custom-product-availability")?.classList.add("hide");

            // Trigger click on any open tooltip close button to close the tooltip on successful submit
            const tooltipCloseButtons = document.querySelectorAll('.tool-tip__close');
            tooltipCloseButtons.forEach(btn => {
                // only click visible buttons (avoid hidden/template ones)
                if (btn.offsetParent !== null) {
                    try {
                        btn.click();
                    } catch (e) {
                        // fallback: dispatch a MouseEvent
                        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                    }
                }
            });
        }
    }

    setFilterStickyPosition() {
        if (matchMedia('(max-width: 767px)').matches) {
            const siteHeader = document.querySelector('.site-header');
            const toolbarSection = document.querySelector('.toolbar-section');
            const collectionFilter = document.querySelector('.collection-filter');
            if (siteHeader && toolbarSection && collectionFilter) {
                const headerHeight = siteHeader.offsetHeight - 1 + toolbarSection.offsetHeight;
                collectionFilter.style.top = headerHeight + 'px';
            }
        }
    }

    getDates(data) {
        const convertToDate = (dateStr) => {
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            let [month, day, year] = dateStr.split("/").map(Number);
            let date = new Date(year, month - 1, day);
            date.setFullYear(date.getFullYear() + 1);

            const getDaySuffix = (day) => {
                if (day >= 11 && day <= 13) return "th";
                switch (day % 10) {
                    case 1: return "st";
                    case 2: return "nd";
                    case 3: return "rd";
                    default: return "th";
                }
            };

            return `${date.getDate()}${getDaySuffix(date.getDate())} ${months[date.getMonth()]} ${date.getFullYear()}`;
        }

        return {
            start: data.shipping_start_date == "Anytime" ? "Anytime" : convertToDate(data.shipping_start_date),
            end: data.shipping_end_date == "Anytime" ? "Anytime" : convertToDate(data.shipping_end_date)
        };
    }
}

customElements.define('locator-form', LocatorForm);


async function getUserZipCodeAndZone() {
    try {
        const heirloomUrl = "https://ship.heirloomroses.com"; //https://heirloomroses.demo.brainvire.dev https://ship.heirloomroses.com
        // window.heirloom_config && window.heirloom_config.heirloom_url
        async function sendClientIPToProxy() {
            const ipRes = await fetch('https://api.ipify.org?format=json');
            const {
                ip
            } = await ipRes.json();

            const response = await fetch('/apps/proxy/get-location', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Client-IP': ip
                }
            });

            const data = await response.json();
            console.log(data.data.zip);



            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            if (data.error) {
                console.error('Location API Error:', data.error.info || data.error);
                throw new Error(data.error.info || data.error);
            }

            const zipCode = data.data.zip;
            console.log('Retrieved ZIP code:', zipCode);

            if (!zipCode) {
                console.error('ZIP code not available from IP location');
                console.log('Location data received:', data);
                return null;
            }

            const zoneResponse = await fetch(`https://ship.heirloomroses.com/api/zone?zip_code=${zipCode}`);
            const zoneData = await zoneResponse.json();

            if (zoneData.data.zoneData[0]) {
                const hardinessZone = zoneData.data.zoneData[0].hardiness_zone.hardiness_zone_name.split(' ')[1];
                console.log('Hardiness Zone:', hardinessZone);

                const locatorForm = document.querySelector('locator-form');
                const zoneDetail = {
                    zone: hardinessZone,
                    zip: zipCode,
                    dates: locatorForm ? locatorForm.getDates(zoneData.data.zoneData[0].hardiness_zone) : {
                        start: 'Anytime',
                        end: 'Anytime'
                    }
                };

                localStorage.setItem('locator', JSON.stringify(zoneDetail));

                const zoneSelectors = document.querySelectorAll(".location_and_grow_zone");
                zoneSelectors.forEach(zone => {
                    const locationContent = zone.querySelector(".location-content");
                    const locationIconWrapper = zone.querySelector(".location-icon-wrapper");
                    const setupZone = zone.querySelector(".setup_zone");
                    const locationZoneSpan = zone.querySelector(".location-zone span.location");

                    if (locationContent) locationContent.classList.remove("hide");
                    if (locationIconWrapper) locationIconWrapper.classList.remove("hide");
                    if (setupZone) setupZone.classList.add("hide");
                    if (locationZoneSpan) locationZoneSpan.innerText = hardinessZone;
                });

                document.querySelectorAll('.hardiness_locator.mobile_locator').forEach(el => {
                    el.remove();
                });

                const toolbarSection = document.querySelector(".toolbar-section");
                if (toolbarSection) {
                    toolbarSection.classList.remove("toolbar-top-106");
                    toolbarSection.classList.add("toolbar-top-61");
                }

                const hardinessZoneMsg = document.querySelectorAll(".success-message-hardiness-zone");
                hardinessZoneMsg.forEach(msg => {
                    msg.innerText = "Hardiness zone: " + hardinessZone;
                    msg.classList.remove("hide");
                });

                const hardinessCollection = document.querySelectorAll(".zone-collection-link");
                if (![1, 2, 12].includes(parseInt(hardinessZone, 10))) {
                    hardinessCollection.forEach(msg => {
                        msg.href = `/collections/hardiness-zone-${hardinessZone}`;
                        msg.classList.remove("hide");
                    });
                } else {
                    hardinessCollection.forEach(msg => {
                        msg.classList.add("hide");
                    });
                }

                const zipCodeMsg = document.querySelectorAll(".success-message-zip-code");
                zipCodeMsg.forEach(msg => {
                    msg.innerText = zipCode;
                    msg.classList.remove("hide");
                });

                const errorMessages = document.querySelectorAll(".zipcode-input-wrapper .error-message");
                errorMessages.forEach(msg => msg.classList.add('hide'));

                if (window.productHardinessZones?.includes(hardinessZone)) {
                    const zoneAvailability = document.querySelector(".custom-product-availability");
                    if (zoneAvailability) {
                        document.querySelector(".loading-skeleton")?.classList.add("hide");
                        zoneAvailability.classList.remove("hide");
                        document.querySelector(".hardiness_zone_product_explore")?.classList.add("hide");
                    }
                } else {
                    if (["1", "2", "12"].includes(hardinessZone)) {
                        document.querySelector(".hardiness_zone_product_explore")?.classList.add("hide");
                    } else {
                        const hardinessElement = document.querySelector(".hardiness_modal_link");
                        if (hardinessElement) {
                            hardinessElement.setAttribute("hardiness_id", hardinessZone);
                            hardinessElement.textContent = "Zone " + hardinessZone;
                        }
                        document.querySelector(".hardiness_zone_product_explore")?.classList.remove("hide");
                    }
                    document.querySelector(".loading-skeleton")?.classList.add("hide");
                    document.querySelector(".custom-product-availability")?.classList.add("hide");
                }

                if (window.CustomerData?.id) {
                    const zipList = Array.isArray(window.CustomerData.hardiness_zipcode) ?
                        window.CustomerData.hardiness_zipcode.map(z => Number(z.trim())) :
                        [];

                    const currentZip = Number(zipCode);
                    const currentZone = Number(hardinessZone);

                    if (!zipList.includes(currentZip)) {
                        await fetch(`https://heirloomroses.demo.brainvire.dev/api/customer/metafields`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                customerId: String(CustomerData.id),
                                zipcode: String(currentZip),
                                zone: String(currentZone),
                            }),
                        });
                    }
                }

                console.log('Hardiness Zone updated successfully across the page');

                return {
                    zipCode: zipCode,
                    hardinessZone: hardinessZone,
                    ip: data.ip,
                    city: data.city,
                    region: data.region_name,
                    country: data.country_name,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    timezone: data.time_zone?.id,
                    currency: data.currency?.code
                };
            } else {
                console.error('No hardiness zone data found for ZIP code:', zipCode);
                return null;
            }
        }
        sendClientIPToProxy();
    } catch (error) {
        console.error('Error fetching location or zone data:', error);
        return null;
    }
}

async function initializeUserLocation() {
    const existingLocation = localStorage.getItem('locator');

    if (existingLocation) {
        return JSON.parse(existingLocation);
    }

    const result = await getUserZipCodeAndZone();
    return result;
}

initializeUserLocation();