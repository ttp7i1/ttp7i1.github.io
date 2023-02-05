

function entry() {
    $("#btn_log").click(function () {
        robot.log("log message")
    });

    $("#btn_say").click(function () {
        robot.log("speak")
    });
}

$(document).ready(entry);
