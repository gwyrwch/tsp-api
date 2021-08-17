const { request, response } = require("express");
const { exec, execSync } = require("child_process");

const are_method_params_valid = require("../util/util");
var fs = require("fs");

const saveTspFile = (testName, matrix, path, points) => {
    // const displayData = "DISPLAY_DATA_SECTION\n" + points.
    console.log("points", points);
    let displayData = "";
    if (points && points.length > 0) {
        displayData =
            "\nDISPLAY_DATA_SECTION\n" +
            points
                .map((point, index) =>
                    [index + 1, point[0], point[1]].join(" ")
                )
                .join("\n");
        console.log(displayData);
    }

    const content =
        `NAME: ${testName}\n` +
        "TYPE: TSP\n" +
        "COMMENT: Temp file\n" +
        `DIMENSION: ${matrix.length}\n` +
        "EDGE_WEIGHT_TYPE: EXPLICIT\n" +
        "EDGE_WEIGHT_FORMAT: FULL_MATRIX\n" +
        "EDGE_WEIGHT_SECTION\n" +
        matrix.map((row) => row.join(" ")).join("\n") +
        displayData +
        "\nEOF";

    fs.writeFileSync(`${path}${testName}.tsp`, content);
};

// Router
const router = (app) => {
    app.post("/savefile", (request, response) => {
        const SAVE_FILE_PARAMS = {
            userId: "userId",
            filename: "filename",
            matrix: "matrix",
            points: "points",
        };

        if (!are_method_params_valid(SAVE_FILE_PARAMS, request.body)) {
            response.send({ msg: "beda" });
            return;
        }

        const path = `userdata/${request.body["userId"]}/${request.body["filename"]}.tsp`;
        try {
            if (!fs.existsSync(path)) {
                response.send({
                    code: 400,
                });
            } else {
                saveTspFile(
                    request.body["filename"],
                    request.body["matrix"],
                    `userdata/${request.body["userId"]}/`,
                    request.body["points"]
                );
                response.send({ code: 201 });
            }
        } catch (err) {
            response.send({ code: 500 });
            console.error(err);
        }

        // TODO: create file with given name
    });

    //curl --header "Content-Type: application/json" --request GET --data '{"userId":5,"filename":"xyz.tsp","options":"{}"}'  http://localhost:3002/run
    app.post("/run", (request, response) => {
        const RUN_PARAMS = {
            userId: "userId",
            matrix: "matrix",
            timeMs: "timeMs",
        };

        if (!are_method_params_valid(RUN_PARAMS, request.body)) {
            response.send({ msg: "beda" });
            return;
        }

        // TODO: run c++ code and send response
        const testName = "tmp";
        const solutionName = "GeneticAlgorithm";
        const solutionDeadline = request.body["timeMs"];
        saveTspFile(testName, request.body["matrix"], "datasets/");

        console.log("Running solution", solutionDeadline);
        execSync(
            `./tsp --mode run-solution --solution-name ${solutionName} --solution-deadline ${solutionDeadline} --test-name ${testName} --optimizer-name SimulatedAnnealing --from-api`
        );

        const solutionVersion = fs.readFileSync(
            `results/${solutionName}.info`,
            "utf-8"
        );
        const path = testName + "_" + solutionName + "_" + solutionVersion;
        const tourFile = fs.readFileSync(`results/${path}.tour`, "utf-8");
        const lines = tourFile.split("\n");

        const result = {
            tour: [],
        };

        let tourSectionStarted = false;
        for (const line of lines) {
            // console.log(line);
            if (line.includes("WEIGHT")) {
                result["weight"] = +line.split(":")[1];
            }
            if (tourSectionStarted) {
                const v = +line;
                if (v !== -1) {
                    result["tour"].push(v);
                } else {
                    tourSectionStarted = false;
                }
            }
            if (line.includes("TOUR_SECTION")) {
                tourSectionStarted = true;
            }
        }
        response.send(result);
    });

    app.get("/alluserfiles", (request, response) => {
        exec(
            `ls userdata/${request.query["userId"]}`,
            (error, stdout, stderr) => {
                if (error) {
                    console.log(`error: ${error.message}`);
                    response.send({
                        code: 400,
                    });
                    return;
                }
                if (stderr) {
                    console.log(`stderr: ${stderr}`);
                    return;
                }

                response.send({
                    files: stdout,
                    code: 200,
                });
            }
        );
    });

    //curl --header "Content-Type: application/json" --request POST --data '{"userId":5,"filename":"xyz.tsp"}'  http://localhost:3002/newfile
    app.post("/newfile", (request, response) => {
        const NEW_FILE_PARAMS = {
            userId: "userId",
            filename: "filename",
        };

        if (!are_method_params_valid(NEW_FILE_PARAMS, request.body)) {
            response.send({ msg: "beda" });
            return;
        }

        // todo: exec only once
        // execSync(`mkdir userdata/${request.body["userId"]}`);

        const path = `userdata/${request.body["userId"]}/${request.body["filename"]}.tsp`;
        try {
            if (fs.existsSync(path)) {
                response.send({
                    code: 400,
                });
            } else {
                fs.writeFileSync(path, "");
                response.send({ code: 201 });
            }
        } catch (err) {
            response.send({ code: 500 });
            console.error(err);
        }
    });

    //curl --header "Content-Type: application/json" --request GET --data '{"userId":5}'  http://localhost:3002/allfiles
    app.post("/allfiles", (request, response) => {
        const ALL_FILES_PARAMS = {
            userId: "userId",
        };

        if (!are_method_params_valid(ALL_FILES_PARAMS, request.body)) {
            response.send({ msg: "beda" });
            return;
        }

        exec(
            `ls userdata/${request.body["userId"]}`,
            (error, stdout, stderr) => {
                if (error) {
                    console.log(`error: ${error.message}`);
                    response.send({
                        code: 400,
                    });
                    return;
                }
                if (stderr) {
                    console.log(`stderr: ${stderr}`);
                    return;
                }

                response.send({
                    files: stdout,
                    code: 200,
                });
            }
        );
    });

    //curl --header "Content-Type: application/json" --request GET --data '{"userId":5, "filename":"getFile.tsp"}'  http://localhost:3002/file
    app.post("/file", (request, response) => {
        const FILE_PARAMS = {
            userId: "userId",
            filename: "filename",
        };

        if (!are_method_params_valid(FILE_PARAMS, request.body)) {
            response.send({ msg: "beda" });
            return;
        }

        const path = `userdata/${request.body["userId"]}/${request.body["filename"]}.tsp`;
        try {
            if (fs.existsSync(path)) {
                const tourFile = fs.readFileSync(path, "utf-8");
                const lines = tourFile.split("\n");
                let matrix = [];
                let points = [];
                let matrixData = false;
                let displayData = false;
                for (const line of lines) {
                    if (line.includes("EOF")) {
                        displayData = false;
                    }

                    if (matrixData && !line.includes("DISPLAY_DATA_SECTION")) {
                        matrix.push(line.split(" ").map((el) => +el));
                    }
                    if (displayData) {
                        console.log("123", line);
                        points.push(
                            line
                                .split(" ")
                                .slice(1)
                                .map((el) => +el)
                        );
                    }

                    if (line.includes("EDGE_WEIGHT_SECTION")) {
                        matrixData = true;
                    } else if (line.includes("DISPLAY_DATA_SECTION")) {
                        matrixData = false;
                        displayData = true;
                    }
                }

                response.send({ code: 200, matrix: matrix, points: points });
            } else {
                response.send({
                    code: 400,
                });
            }
        } catch (err) {
            response.send({ code: 500 });
            console.error(err);
        }
        // TODO: run c++ code and send response
    });
};

// Export the router
module.exports = router;
