htmx.defineExtension('date', {
    onEvent: function (name, evt) {
        if (name === 'htmx:afterProcessNode') {
            const element = evt.detail.elt;
            const dataDate = element.dataset.date;
            if (dataDate) {
                const timestamp = parseInt(dataDate);
                element.textContent = dayjs(timestamp).fromNow();
                window.addEventListener("focus", function () {
                    element.textContent = dayjs(timestamp).fromNow();
                });
            };
        }
    }
});
