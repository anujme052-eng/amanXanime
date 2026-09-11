# Fix large video uploads

## Changes
- Route resumable uploads through the dedicated storage upload host instead of the general API host.
- Authorize each upload with the current signed-in session token, while retaining the publishable key as a fallback for existing anonymous policy behavior.
- Keep Supabase-compatible 6 MB chunks and resumable upload fingerprints, but extend retry delays for unstable mobile networks.
- Improve the admin error message when the browser loses connectivity during a chunk upload.

## Validation
- Run the project checks.
- Verify the admin page opens and the upload control remains usable.

## Technical details
The failure occurs after the first 6 MB chunk with no HTTP response, which indicates the browser lost the PATCH request before receiving a server response. The fix keeps the supported TUS chunk size while using the direct storage hostname and stronger retry behavior.
