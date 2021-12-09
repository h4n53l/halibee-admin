import * as functions from "firebase-functions";

import firebaseAdmin = require("firebase-admin");

firebaseAdmin.initializeApp();

exports.addFreelancerRole = functions.firestore
  .document("/freelancerApplications/{userUID}")
  .onDelete((snap, context) => {
    const userUID = context.params.userUID;
    const skillCategory = snap.data().skillCategory;
    const hiveName = snap.data().hiveName;
    const skill = snap.data().skill;

    firebaseAdmin
      .auth()
      .setCustomUserClaims(userUID, {
        freelancer: true,
      })
      .catch((error: any) => {
        return error;
      });
    return firebaseAdmin
      .auth()
      .getUser(userUID)
      .then((user) => {
        firebaseAdmin
          .firestore()
          .doc("freelancers/" + user.uid)
          .set({
            avatar: user.photoURL,
            about: "I am a " + skill + ".",
            bannerImageURL:
              "https://firebasestorage.googleapis.com/v0/b/halibee.appspot.com/o/images%2FdefaultImages%2Fbanner-placeholder.png?alt=media&token=6ec79b26-fb38-4e36-8fe7-bba9de7663f5",
            cardImageURL: user.photoURL,
            category: skillCategory,
            description: "I am a " + skill + ".",
            displayName: user.displayName,
            hiveName,
            projects: 0,
            rating: 0,
            skill,
            uniqueID: user.uid,
          });
      });
  });

exports.createHiveRequest = functions.database
  .ref("{uid}/myProjects/{projectID}")
  .onCreate((snapshot, context) => {
    const clientProjectReference = context.params.projectID;
    const hireRequestData = snapshot.val();
    return firebaseAdmin
      .database()
      .ref(hireRequestData.freelancerUID + "/hireRequests")
      .push({
        ...hireRequestData,
        clientProjectReference,
      })
      .then((hireRequestReference) => {
        hireRequestReference.ref.update({
          hireRequestReference: hireRequestReference.key,
        });
      });
  });

exports.createClientProject = functions.database
  .ref("{uid}/clientProjects/{projectID}")
  .onCreate((snapshot, context) => {
    const freelancerProjectReference = context.params.projectID;
    const clientProjectData = snapshot.val();
    return firebaseAdmin
      .database()
      .ref(
        clientProjectData.clientUID +
          "/myProjects/" +
          clientProjectData.clientProjectReference
      )
      .update({
        ...clientProjectData,
        requestStatus: "Ongoing",
        freelancerProjectReference,
      });
  });

exports.registerNewUser = functions.auth.user().onCreate((newUser) => {
  firebaseAdmin
    .firestore()
    .doc("users/" + newUser.uid)
    .set({
      displayName: newUser.displayName,
      email: newUser.email,
      emailVerified: newUser.emailVerified,
      joined: newUser.metadata.creationTime,
      avatar: newUser.photoURL,
      uniqueID: newUser.uid,
    });
});

exports.updateReviews = functions.database
  .ref("{uid}/completedProjects/")
  .onUpdate((snapshot, context) => {
    const newlyAdded = Object.values(snapshot.after.val());
    const totalCompletedProjects = newlyAdded.filter((project: any) =>
    project.freelancerUID == context.params.uid
  ).length;
    const reviewed = newlyAdded.filter((project: any) =>
      project.hasOwnProperty("review")
    );

    const ratings: any[] = [];

    reviewed.forEach((project: any) => {
      ratings.push(project.review.rating);
    });

    const totalReviews = ratings.length;
    const fiveStarReviews = ratings.filter(
      (rating: any) => rating === 5
    ).length;
    const fourStarReviews = ratings.filter(
      (rating: any) => rating === 4
    ).length;
    const threeStarReviews = ratings.filter(
      (rating: any) => rating === 3
    ).length;
    const twoStarReviews = ratings.filter((rating: any) => rating === 2).length;
    const oneStarReviews = ratings.filter((rating: any) => rating === 1).length;


    var sum = 0;
    for (var i = 0; i < ratings.length; i++) {
      sum += ratings[i];
    }


    var average = (sum / totalReviews).toFixed(0);

    const fiveStarPercentage = ((fiveStarReviews / totalReviews) * 100).toFixed(0)+"%";
    const fourStarPercentage = ((fourStarReviews / totalReviews) * 100).toFixed(0)+"%";
    const threeStarPercentage = ((threeStarReviews / totalReviews) * 100).toFixed(0)+"%";
    const twoStarPercentage = ((twoStarReviews / totalReviews) * 100).toFixed(0)+"%";
    const oneStarPercentage = ((oneStarReviews / totalReviews) * 100).toFixed(0)+"%";

    firebaseAdmin.firestore().doc("freelancers/"+context.params.uid).update({
      projects: totalCompletedProjects,
      rating: average,
      totalReviews,
      fiveStarPercentage,
      fourStarPercentage,
      threeStarPercentage,
      twoStarPercentage,
      oneStarPercentage,
    });
  });
