# Homework Launchpad — the lab copy

This is the test copy of [Homework Launchpad](https://silocell.github.io/HEH-Homework/).
New things are tried here first. If they survive, they go to the real site;
if they break, nobody using the real site notices.

It has its own database, on a server of its own, with made-up pupils.
Nothing done here touches a real account. A purple bar across the top tells you you're on
the lab copy.

How it works: the real site's repository has a `lab` branch. That branch
is pushed here, and this repository is published with GitHub Pages. When a
change on `lab` has been tried and is fine, it's merged into `main` on the
real site. The same files serve both; the purple bar only appears at the
lab address.
