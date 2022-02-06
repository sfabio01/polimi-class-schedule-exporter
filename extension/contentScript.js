var lessons = [];
var rows = document.getElementById('tableContainer').firstElementChild.firstElementChild.children;

var currentRoom = '';
var currentRoomLink = '';

for (var row of rows) {

    if (row.className !== 'normalRow')
        continue;

    var element = row.firstElementChild;
    var minutesCount = 0;

    while (element != null) {

        if (element.className === 'dove' && element.firstElementChild != null) {
            currentRoom = element.firstElementChild.innerHTML.trim();
            currentRoomLink = element.firstElementChild.getAttribute('href');
        }

        if (element.className.startsWith('slot')) {
            var lesson = new Object();
            var text = element.firstElementChild.getAttribute('title');
            lesson.subject = text.substring(0, text.indexOf('<br>')).trim();
            lesson.type = text.substring(text.indexOf('<br>') + 4, text.indexOf('(')).trim();
            lesson.room = currentRoom;
            //lesson.roomLink = currentRoomLink;
            lesson.startDate = text.substr(text.indexOf('(dal') + 5, 10);
            lesson.endDate = text.substr(text.lastIndexOf('al') + 3, 10);
            lesson.startTime = minutesCount;
            minutesCount += element.getAttribute('colspan') * 15;
            lesson.endTime = minutesCount;
            lessons.push(lesson);
        }

        if (element.className.startsWith('css_prima_riga'))
            minutesCount += 15;

        element = element.nextElementSibling;
    }

}

console.log(lessons);
let banner = document.createElement("div");
let exportBtn = document.createElement("button");
exportBtn.textContent = "Export to Google Calendar";
exportBtn.onclick = () => {
    let path = chrome.runtime.getURL("./convert_page.html");
    var form = document.createElement("form");
    form.setAttribute("method", "get");
    form.setAttribute("action", path);
    form.setAttribute("target", "_blank");

    var field = document.createElement("input");
    field.setAttribute("type", "hidden");
    field.setAttribute("name", "lessons");
    field.setAttribute("value", JSON.stringify(lessons));

    form.append(field);

    document.body.append(form);
    form.submit();
}
banner.appendChild(exportBtn);
banner.style.backgroundColor = '#069';
banner.style.height = "30px"
banner.style.display = "flex"
banner.style.justifyContent = "center"
banner.style.alignItems = "center"
document.body.insertBefore(banner, document.body.childNodes[0]);


chrome.runtime.onMessage.addListener(
    function (msg, sender, sendResponse) {
        if (msg == "get-schedule") {
            sendResponse(lessons);
        }
    }
);


