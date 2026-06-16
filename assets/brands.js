const brandSearch = document.getElementById('brand-search');
var itemCount = document.querySelectorAll(".brand-list-item").length;
if (itemCount <= 10) {
    document.querySelector(".brand-list-auto").classList.add("list-ultra-low-column");
} else if (itemCount <= 35) {
    document.querySelector(".brand-list-auto").classList.add("list-low-column");
} else {
    document.querySelector(".brand-list-auto").classList.remove("list-ultra-low-column", "list-low-column");
}
brandSearch.addEventListener('keyup', function() {

    const brandListItems = document.querySelectorAll('.brand-list-item');
    const searchHeader = document.querySelector('.search-header');

    const searchValue = this.value.toLowerCase();
    let matchFound = false;
    document.querySelectorAll('.brand-letter-heading').forEach(function(item) {
        item.style.display = "none";
    });

    brandListItems.forEach(item => {
        const itemText = item.textContent.toLowerCase();
        if (itemText.includes(searchValue)) {
            item.style.display = 'list-item';
            matchFound = true;
        } else {
            item.style.display = 'none';
        }
    });

    if (searchValue === '') {
        searchHeader.style.display = 'none';
    } else {
        searchHeader.style.display = 'block';
    }

    if (matchFound) {
        searchHeader.textContent = 'Search Results';
    } else {
        searchHeader.textContent = 'No results found';
    }
});
document.querySelectorAll("[data-trigger-letter]").forEach(function(item) {
    item.addEventListener("click", function() {
        document.querySelectorAll("[data-trigger-letter]").forEach(function(element) {
            element.classList.remove("active");
        });
        this.classList.add("active");
        document.querySelector(".search-header").style.display = "none";
        var letter = this.dataset.triggerLetter;
        const lowercaseLetter = letter.toLowerCase();
        console.log(letter);
        if (letter === "all" || letter === 'جميع الأقسام') {
            document.querySelectorAll(".brand-list-item").forEach(function(item) {
                item.style.display = "block";
                item.classList.add("current");
            });
            document.querySelectorAll(".brand-letter-heading").forEach(function(item) {
                item.style.display = "block";
                item.classList.add("current");
            });
            var itemCount = document.querySelectorAll(".brand-list-item.current").length;
            if (itemCount <= 10) {
                document.querySelector(".brand-list-auto").classList.add("list-ultra-low-column");
            } else if (itemCount <= 35) {
                document.querySelector(".brand-list-auto").classList.add("list-low-column");
            } else {
                document.querySelector(".brand-list-auto").classList.remove("list-ultra-low-column", "list-low-column");
            }
        } else {
            document.querySelectorAll(".brand-list-item").forEach(function(item) {
                const itemLetter = item.getAttribute('data-letter').toLowerCase();;
                if (itemLetter === lowercaseLetter) {
                    item.style.display = "block";
                    item.classList.add("current");
                } else {
                    item.style.display = "none";
                    item.classList.remove("current");
                }

            });
            document.querySelectorAll(".brand-letter-heading").forEach(function(item) {
                const itemLetter = item.getAttribute('data-letter').toLowerCase();;
                if (itemLetter === lowercaseLetter) {
                    item.style.display = "block";
                    item.classList.add("current");
                } else {
                    item.style.display = "none";
                    item.classList.remove("current");
                }
            });

            var itemCount = document.querySelectorAll(".brand-list-item.current").length;
            document.querySelector(".brand-list-auto").classList.remove("list-ultra-low-column", "list-low-column");
            if (itemCount <= 10) {
                document.querySelector(".brand-list-auto").classList.add("list-ultra-low-column");
            } else if (itemCount <= 35) {
                document.querySelector(".brand-list-auto").classList.add("list-low-column");
            } else {
                document.querySelector(".brand-list-auto").classList.remove("list-ultra-low-column", "list-low-column");
            }
        }
    });
});