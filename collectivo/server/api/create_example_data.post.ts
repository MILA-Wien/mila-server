import {
  createItem,
  createItems,
  createUser,
  deleteItems,
  readRoles,
  readUsers,
  readItems,
  updateUser,
} from "@directus/sdk";

import { DateTime } from "luxon";

export default defineEventHandler(async (_event) => {
  create_examples();
});

async function getRole(name: string) {
  const directus = await useDirectusAdmin();

  const membersRoles = await directus.request(
    readRoles({
      filter: {
        name: { _eq: name },
      },
    }),
  );

  if (membersRoles.length < 1) {
    throw new Error(name + " role not found");
  }

  return membersRoles[0].id;
}

async function create_examples() {
  console.info("Creating example data for collectivo");
  await create_users();
  await purge_assignments();
  await create_memberships();
  await create_tags();
  await create_tiles();
  await create_emails();
  await create_shifts();
  console.log("Seed successful");
}

async function create_users() {
  const directus = await useDirectusAdmin();
  const userRole = await getRole("NutzerInnen");
  const editorRole = await getRole("Mitgliederverwaltung");
  const adminRole = await getRole("Administrator");

  // Create some users
  console.info("Creating users");

  const userNames = [
    "Admin",
    "Editor",
    "User",
    "Alice",
    "Bob",
    "Charlie",
    "Dave",
  ];

  const users = [];

  for (const userName of userNames) {
    const email = `${userName.toLowerCase()}@example.com`;

    const u = {
      first_name: userName,
      last_name: "Example",
      email: email,
      password: `${userName.toLowerCase()}`,
      role: userRole,
      status: "active",
    };

    if (userName == "Admin") {
      u.role = adminRole;
    }

    if (userName == "Editor") {
      u.role = editorRole;
    }

    users.push(u);
  }

  for (const user of users) {
    const usersDB = await directus.request(
      readUsers({
        filter: { email: { _eq: user.email } },
      }),
    );

    let userID;

    if (usersDB.length > 0) {
      userID = usersDB[0].id;
      // tslint:disable-next-line:no-console
      // console.info("Updating user " + user.email + " with ID " + userID);
      await directus.request(updateUser(userID, user));
      // tslint:disable-next-line:no-console
    } else {
      // tslint:disable-next-line:no-console
      console.info("Creating user " + user.email);
      const us = await directus.request(createUser(user));
      userID = us.id;
    }
  }
}

async function create_tags() {
  const directus = await useDirectusAdmin();

  // Create some tags
  console.info("Creating tags");

  await directus.request(deleteItems("collectivo_tags", { limit: 1000 }));
  const tagNames = ["Has a dog", "Has a cat", "Has a bird", "Has a fish"];
  const tags: object[] = [];

  for (const tagName of tagNames) {
    tags.push({
      tags_name: tagName,
    });
  }

  // Add some members to some tags
  // TODO: This is not working
  // console.info("Creating tag-member relations");
  // for (var i = 0; i < 3; i++) {
  //   tags[i].directus_users = {
  //     create: [
  //       { collectivo_tags_id: "+", directus_users_id: { id: 1 } },
  //       { collectivo_tags_id: "+", directus_users_id: { id: 2 } },
  //       { collectivo_tags_id: "+", directus_users_id: { id: 3 } },
  //     ],
  //   };
  // }

  try {
    await directus.request(createItems("collectivo_tags", tags));
  } catch (error) {
    console.info(error);
  }
}
async function create_emails() {
  const directus = await useDirectusAdmin();
  // Create email templates
  console.info("Creating email templates");
  await directus.request(deleteItems("messages_templates", { limit: 1000 }));
  const templates = [];

  for (const i in [1, 2, 3]) {
    templates.push({
      messages_name: `Example Template ${i}`,
      messages_method: "email",
      messages_subject: `Example Subject ${i}`,
      messages_content:
        "Hello {{recipient_first_name}} {{recipient_last_name}}. \n This is a second line.",
    });
  }

  const templateIds = [];

  try {
    const ids = await directus.request(
      createItems("messages_templates", templates),
    );

    templateIds.push(...ids);
  } catch (error) {
    console.info(error);
  }
}
async function create_tiles() {
  const directus = await useDirectusAdmin();
  // Create some tiles
  console.info("Creating tiles");
  await directus.request(deleteItems("collectivo_tiles", { limit: 1000 }));

  const tileData = [
    {
      name: "Tile 1",
      color: "primary",
    },
    {
      name: "Tile 2",
      color: "green",
    },
    {
      name: "Tile 3",
      color: "orange",
    },
    {
      name: "Tile 4",
      color: "blue",
    },
  ];

  const tiles = [];

  const tileButton = {
    tiles_label: "Example Button",
    tiles_path: "/some/path",
    tiles_tile: "",
  };

  for (const td of tileData) {
    tiles.push({
      tiles_name: td.name,
      tiles_content: "Hello! I am an example tile!",
      tiles_color: td.color,
      tiles_status: "published",
    });
  }

  try {
    const tilesRes = await directus.request(
      createItems("collectivo_tiles", tiles),
    );

    for (const tile of tilesRes) {
      tileButton.tiles_tile = tile.id;

      await directus.request(
        createItem("collectivo_tiles_buttons", tileButton),
      );
    }
  } catch (error) {
    console.info(error);
  }
}

async function purge_assignments() {
  const directus = await useDirectusAdmin();

  console.info("Purging shift assignments");

  await directus.request(deleteItems("shifts_assignments", { limit: 1000 }));
}

async function create_memberships() {
  const directus = await useDirectusAdmin();

  console.info("Creating memberships 1");

  // Clean up old data
  // might error because of not_null constraint in assignment relation
  await directus.request(deleteItems("memberships", { limit: 1000 }));

  console.info("Creating memberships 2");

  // Create some memberships
  const mships = [
    ["Alice", "applied"],
    ["Bob", "approved"],
    ["Charlie", "approved"],
    ["Dave", "in-cancellation"],
    ["User", "approved"],
    ["Editor", "approved"],
    ["Admin", "approved"],
  ];

  for (const mship of mships) {
    console.info("Creating memberships 3", mship);
    // Get user id
    const user_id = (
      await directus.request(readUsers({ filter: { first_name: mship[0] } }))
    )[0].id;

    console.info("Creating memberships 4");

    // Create membership
    await directus.request(
      createItem("memberships", {
        memberships_user: user_id,
        memberships_type: "Aktiv",
        memberships_status: mship[1],
        shifts_user_type: "regular",
      }),
    );
  }

  console.info("Creating memberships 5");
}

async function create_shifts() {
  console.log("Creating shifts");
  console.log("  claning shifts...");
  await cleanShiftsData();
  console.log("  creating shifts...");
  await createShifts();
  console.log("  creating assignments...");
  await createAssignments();
  // await createLogs();
}

async function cleanShiftsData() {
  const directus = await useDirectusAdmin();

  const schemas = [
    "shifts_shifts",
    "shifts_assignments",
    "shifts_absences",
    "shifts_logs",
  ];

  for (const schema of schemas) {
    console.log(`    deleting 1000 items in schema ${schema} ...`);
    await directus.request(deleteItems(schema, { limit: 1000 }));
  }
}

const SHIFT_TIMES_OF_DAY = [8, 11, 14, 17];
const SHIFT_CYCLE_START = DateTime.now().minus({ weeks: 4 }).startOf("week");
const SHIFT_CYCLE_DURATION_WEEKS = 4;

async function createShifts() {
  const directus = await useDirectusAdmin();

  const monday = SHIFT_CYCLE_START;
  const shiftsRequests: ShiftsShift[] = [];

  const nb_weeks = SHIFT_CYCLE_DURATION_WEEKS;

  for (let week = 0; week < nb_weeks; week++) {
    for (let weekday = 0; weekday < 5; weekday++) {
      const day = monday.plus({ days: weekday, week: week });

      for (const time_of_day of SHIFT_TIMES_OF_DAY) {
        shiftsRequests.push({
          shifts_name:
            ["A", "B", "C", "D"][week] +
            "-" +
            day.weekdayShort +
            "-" +
            time_of_day,
          shifts_from: day.set({ hour: time_of_day }).toString(),
          shifts_from_time: String(time_of_day) + ":00",
          shifts_to_time: String(time_of_day + 3) + ":00",
          shifts_is_regular: true,
          shifts_repeats_every: nb_weeks * 7,
          shifts_status: "published",
          shifts_slots: 2,
          shifts_allow_self_assignment: true,
        });
      }
    }
  }

  await directus.request(createItems("shifts_shifts", shiftsRequests));
}

async function createAssignments() {
  const directus = await useDirectusAdmin();

  const shifts = await directus.request(
    readItems("shifts_shifts", {
      fields: ["id"],
    }),
  );

  const mships = await directus.request(
    readItems("memberships", {
      fields: ["id"],
    }),
  );

  const assignments = [];

  for (const mship of mships) {
    const shift = shifts.pop();

    if (!shift) {
      break;
    }

    assignments.push({
      shifts_from: DateTime.now().toString(),
      shifts_shift: shift.id,
      shifts_membership: mship.id,
      shifts_is_regular: true,
    });
  }

  await directus.request(createItems("shifts_assignments", assignments));
}

// async function createLogs() {
//   const directus = await useDirectusAdmin();

//   const assignments = await directus.request(
//     readItems("shifts_assignments", {
//       fields: ["*"],
//     }),
//   );

//   const requests: ShiftsLog[] = [];

//   for (const assignment of assignments) {
//     const nbLogs = getRandomInt(5, 20);

//     for (let i = 0; i < nbLogs; i++) {
//       const types = [
//         ShiftLogType.ATTENDED,
//         ShiftLogType.ATTENDED,
//         ShiftLogType.MISSED,
//         ShiftLogType.CANCELLED,
//       ];

//       requests.push({
//         shifts_type: types[getRandomInt(0, types.length)],
//         shifts_date: DateTime.now()
//           .plus({ days: getRandomInt(-10, 10) })
//           .toISO(),
//         shifts_assignment: assignment.id,
//         shifts_user: assignment.shifts_user,
//       });
//     }
//   }

//   await directus.request(createItems("shifts_logs", requests));
// }

//   // Payments ----------------------------------------------------------------------

//   // Clean up old data
//   await directus.request(deleteItems("payments_invoices_out", { limit: 1000 }));

//   const invoice_ids = [];

//   const users = await directus.request(
//     readUsers({ filter: { first_name: "Alice" } }),
//   );

//   for (const status of ["pending", "paid"]) {
//     const res = await directus.request(
//       createItem("payments_invoices_out", {
//         payments_recipient_user: users[0].id,
//         payments_status: status,
//         payments_date_issued: new Date(),
//       }),
//     );

//     invoice_ids.push(res.id);
//   }

//   for (const invoice_id of invoice_ids) {
//     await directus.request(
//       createItem("payments_invoices_entries", {
//         payments_invoice: invoice_id,
//         payments_description: "Test item",
//         payments_quantity: 1,
//         payments_price: 100,
//       }),
//     );
//   }
// }

// import { createItem, deleteItems, readUsers } from "@directus/sdk";
