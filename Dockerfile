FROM ubuntu:latest
COPY assets /temp_dir
RUN apt-get update && apt-get install -y python3 python3-pip && pip3 install -r /temp_dir/requirements.txt
WORKDIR /temp_dir/app
ENTRYPOINT ["python3", "api.py"]
