import { execSync } from 'child_process';
import process from 'process';

const handleError = (message) => {
    console.error(`Error: ${message}`);
    process.exit(1);
};

export const cherryPick = async (branchPr, releaseType, releaseName, rootCausePr, jiraTicket, reasonFix) => {
    try {
        console.log('branchPr', branchPr);
        console.log('releaseType', releaseType);
        console.log('releaseName', releaseName);
        console.log('rootCausePr', rootCausePr);
        console.log('jiraTicket,', jiraTicket);
        console.log('reasonFix', reasonFix);

        const prJson = JSON.parse(execSync(`gh pr view ${branchPr} --json author,mergeCommit,mergeable,mergedAt,number,title,url,id,labels`).toString());
        const rootCauseJson = JSON.parse(execSync(`gh pr view ${rootCausePr} --json author,mergeCommit,mergeable,mergedAt,number,title,url,id,labels`).toString());

        if (prJson.id === rootCauseJson.id) {
            handleError('The PR and the root cause have to be different');
        }
        if (prJson.mergedAt === null || prJson.mergeCommit === null || prJson.mergeable !== 'UNKNOWN') {
            handleError('The PR to merge has not been merged to main, please make sure that you are using the right PR id');
        }
        if (rootCauseJson.mergedAt === null || rootCauseJson.mergeCommit === null || rootCauseJson.mergeable !== 'UNKNOWN') {
            handleError('The root cause pr has not been merged to main, please make sure that you are using the right PR id');
        }

        execSync('git fetch --all');
        const branchList = execSync('git branch -r --list "*release*" --format "%(refname:lstrip=3)"').toString();

        if (!branchList.includes(`release/${releaseName}`)) {
            handleError("The branch doesn't exist, please make sure that you are using the correct name. Remember to only specify the name of the branch, for example release/BRANCH-NAME**");
        }

        // Verify release type
        if (releaseType === 'Emergency') {
            console.log('Emergency fix');
        }

        // Checkout the release branch
        execSync(`git checkout release/${releaseName}`);
        const newBranchName = `hotfix/${prJson.author.login}/cherry-pick-automation-${Date.now()}-${prJson.id}`;
        execSync(`git checkout -b ${newBranchName}`);
        execSync(`git cherry-pick ${prJson.mergeCommit.oid}`);

        console.log(`Cherry-picked commit ${mergeCommitSha} onto ${newBranchName}`);

        // Push the new branch to remote
        execSync(`git push origin ${newBranchName}`);
        const template = fs.readFileSync('CHERRY_PICK_PULL_REQUEST.md', 'utf8');
        const replacements = {
            'inputs.branchPr': branchPr,
            'inputs.releaseType': releaseType,
            'inputs.releaseName': releaseName,
            'inputs.rootCausePr': rootCausePr,
            'inputs.jiraTicket': jiraTicket,
            'inputs.reasonFix': reasonFix
        };
        const prBody = replacePlaceholders(template, replacements);
        // Write the updated markdown to a temp file
        const tempFilePath = '/tmp/CHERRY_PICK_PULL_REQUEST.md';
        fs.writeFileSync(tempFilePath, prBody);

        // Create a new PR
        const prTitle = `Cherry-pick PR ${branchPr} into release/${releaseName}`;
        const newPrJson = JSON.parse(execSync(`gh pr create -B release/${releaseName} -H ${newBranchName} -t "${prTitle}" -F ${tempFilePath} --json number,url`).toString());

        console.log(`Created new PR #${newPrJson.number}: ${newPrJson.url}`);

        // Verify release type
        return true;
    } catch (error) {
        handleError(error.message);
    }
};
// Manejo de argumentos de entrada
const [branchPr, releaseType, releaseName, rootCausePr, jiraTicket, reasonFix] = process.argv.slice(2);
cherryPick(branchPr, releaseType, releaseName, rootCausePr, jiraTicket, reasonFix);