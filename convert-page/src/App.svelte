<script>
	import {
		minsToTime,
		colors,
		sendToGoogleCalendar,
		getCalendarList,
	} from "./utils";
	import "./style.css";

	let finish = false;
	let url = new URL(window.location.href);
	let stringParam = url.searchParams.get("lessons");
	let lessons = JSON.parse(stringParam);
	// console.log(lessons);
	var subjects = [];
	var events = [];
	var subjectColorsId = {};

	for (let lesson of lessons) {
		if (!subjects.includes(lesson.subject)) subjects.push(lesson.subject);

		let startDate = moment(lesson.startDate, "DD/MM/YYYY").format(
			"YYYY-MM-DD"
		);
		let endDate = moment(lesson.endDate, "DD/MM/YYYY").format("YYYYMMDD");
		let startTime = minsToTime(lesson.startTime);
		let endTime = minsToTime(lesson.endTime);

		let event = {
			summary: lesson.subject + " (" + lesson.type + ")",
			description: "Aula: " + lesson.room,
			start: {
				dateTime: startDate + "T" + startTime,
				timeZone: "Europe/Rome",
			},
			end: {
				dateTime: startDate + "T" + endTime,
				timeZone: "Europe/Rome",
			},
			recurrence: ["RRULE:FREQ=WEEKLY;UNTIL=" + endDate + "T240000Z"],
		};
		events.push(event);
	}

	console.log(events);

	function colorChanged(sub) {
		let select = document.getElementById(sub + "select");
		subjectColorsId[sub] = select.value;
		console.log(subjectColorsId);
	}

	var calendarList = [];
	var userToken = "";

	function continueWithGoogle() {
		document.getElementById("submitBtn").disabled = true;
		chrome.identity.getAuthToken(
			{ interactive: true },
			async function (token) {
				console.log(token);
				if (!token) {
					// TODO: error
					document.getElementById("submitBtn").disabled = false;
					alert(
						"Authentication error: invalid token\nNote that if you are using Edge it might not work"
					);
					return;
				}
				userToken = token;
				try {
					let res = await getCalendarList(token);
					if (!res) {
						document.getElementById("submitBtn").disabled = false;
						alert("Error: can't fetch calendar list");
						return;
					}
					calendarList = res;
					document.getElementById("submitBtn").hidden = true;
					document.getElementById("chooseCalendar").hidden = false;
				} catch (error) {
					alert(error);
					document.getElementById("submitBtn").disabled = false;
				}
			}
		);
	}
	async function exportSchedule() {
		document.getElementById("exportBtn").disabled = true;
		let calId = document.querySelector(
			'input[name="calendarRadio"]:checked'
		).value;
		try {
			await sendToGoogleCalendar(
				events,
				lessons,
				subjectColorsId,
				userToken,
				calId ?? "primary"
			);
			finish = true;
		} catch (error) {
			alert(error);
			document.getElementById("exportBtn").disabled = false;
		}
	}
</script>

<main>
	{#if !finish}
		<div class="container">
			<div class="row text-center">
				<div class="col">
					<div class="fs-1 fw-bold">YOUR CLASSES</div>
				</div>
			</div>
			<div
				class="row row-cols-2 justify-content-md-center gy-3 mt-1"
				id="subjectList"
			>
				{#each subjects as sub}
					<div class="col">
						<h4>{sub}</h4>
						{#each lessons as { subject, type, startDate, endDate, room }, i}
							{#if sub == subject}
								<div class="fw-light text-capitalize">
									{type},
									{startDate} - {endDate}, {events[
										i
									].start.dateTime
										.split("T")[1]
										.split("+")[0]
										.substring(0, 5)} - {events[
										i
									].end.dateTime
										.split("T")[1]
										.split("+")[0]
										.substring(0, 5)}, {room}
								</div>
							{/if}
						{/each}
					</div>
					<div class="col-auto">
						<select
							id={sub + "select"}
							class="form-select"
							aria-label="Select color"
							on:change={() => {
								colorChanged(sub);
							}}
						>
							{#each Object.entries(colors) as [name, value]}
								<option {value} class={name}>{name}</option>
							{/each}
						</select>
					</div>
				{/each}
			</div>
			<div class="row text-center mt-4 mb-3">
				<div class="col">
					<button
						class="btn btn-primary"
						id="submitBtn"
						on:click={continueWithGoogle}
						><b>CONTINUE WITH GOOGLE</b></button
					>
				</div>
			</div>
			<div
				class="row text-center justify-content-md-center mb-5"
				id="chooseCalendar"
				hidden
			>
				<div class="col" style="max-width: fit-content;">
					<h2><b>CHOOSE A CALENDAR</b></h2>
					{#each calendarList as cal}
						<div class="form-check">
							<input
								required
								class="form-check-input"
								type="radio"
								name="calendarRadio"
								id={cal.id}
								value={cal.id}
							/>
							<label class="form-check-label" for={cal.id}>
								{cal.summary}
							</label>
						</div>
					{/each}
					<button
						type="submit"
						class="btn btn-primary mt-4"
						on:click={exportSchedule}
						id="exportBtn"><b>EXPORT TO GOOGLE CALENDAR</b></button
					>
				</div>
			</div>
		</div>
	{:else}
		<div class="container">
			<h1>Success</h1>
		</div>
	{/if}
</main>
